import streamlit as st
import json
from datetime import datetime
import os

def manual_export():
    """Manually export ParaThinker results if they exist in session state"""
    
    # Try to access session state (this will only work if run in the same Streamlit context)
    if hasattr(st, 'session_state') and hasattr(st.session_state, 'parathinker_result'):
        result = st.session_state.parathinker_result
        
        if result:
            # Create the export manually
            timestamp = datetime.now()
            filename = f"myui_parathinker_export_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
            
            # Get prompt from history if available
            prompt = "No prompt available"
            if hasattr(st.session_state, 'history') and st.session_state.history:
                prompt = st.session_state.history[0].get("prompt", "No prompt available")
            
            # Create markdown content
            content = f"""# MyUI ParaThinker Results - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

## Original Prompt
```
{prompt}
```

## ParaThinker Synthesis Results
{json.dumps(result, indent=2)}
"""
            
            # Write file
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Exported to {filename}")
            return filename
    
    print("❌ No ParaThinker results found in session state")
    return None

if __name__ == "__main__":
    manual_export()