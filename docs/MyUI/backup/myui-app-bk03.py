import streamlit as st
import asyncio
import aiohttp
import json
import os
import time
import random
from datetime import datetime

# Configure Streamlit page
st.set_page_config(
    page_title="MyUI - ParaThinker Multi-AI Interface", 
    layout="wide",
    initial_sidebar_state="expanded"
)

# Global variables for model configurations (loaded dynamically)
MODELS = {}
PREMIUM_SYNTHESIS_MODELS = []

OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions"
CONTEXT_FILE = "project_context.json"
CONFIG_FILE = "myui_config.json"
MODELS_CONFIG_FILE = "myui_models.json"  # NEW: Separate file for model configurations
HISTORY_FILE = "query_history.json"
def load_models_config():
    """Load model configurations from separate JSON file"""
    # Load from file - no default models
    if os.path.exists(MODELS_CONFIG_FILE):
        try:
            with open(MODELS_CONFIG_FILE, 'r') as f:
                loaded_config = json.load(f)
                
                # Validate structure
                if "models" not in loaded_config or not loaded_config["models"]:
                    st.error(f"❌ CRITICAL: {MODELS_CONFIG_FILE} exists but has no models configured!")
                    st.error("❌ Please add models to the 'models' section in your config file.")
                    st.stop()
                    
                return loaded_config
        except Exception as e:
            st.error(f"❌ CRITICAL: Error loading models config: {e}")
            st.error(f"❌ Your config file exists but has errors. Please fix manually!")
            st.stop()
    else:
        st.error(f"❌ CRITICAL: Model configuration file '{MODELS_CONFIG_FILE}' not found!")
        st.error("❌ Please create the file with your model configurations.")
        st.error("❌ No hardcoded defaults available - you must configure your models.")
        st.stop()

def initialize_models():
    """Initialize global MODELS and PREMIUM_SYNTHESIS_MODELS from config"""
    global MODELS, PREMIUM_SYNTHESIS_MODELS
    
    models_config = load_models_config()
    
    # Populate MODELS dictionary
    MODELS = {}
    PREMIUM_SYNTHESIS_MODELS = []
    
    for model_id, model_data in models_config["models"].items():
        MODELS[model_id] = {
            "name": model_data["name"],
            "cost": model_data["cost"],
            "provider": model_data["provider"]
        }
        
        # Add to premium synthesis list if enabled for Stage 2
        if model_data.get("stage2_enabled", False):
            PREMIUM_SYNTHESIS_MODELS.append(model_id)
    
    return models_config

def load_config():
    """Load user configuration from file"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                # Ensure synthesis_model is valid
                if PREMIUM_SYNTHESIS_MODELS and config.get('synthesis_model') not in PREMIUM_SYNTHESIS_MODELS:
                    config['synthesis_model'] = PREMIUM_SYNTHESIS_MODELS[0]
                return config
        except:
            pass
    
    # Return default config - no hardcoded models
    default_synthesis_model = PREMIUM_SYNTHESIS_MODELS[0] if PREMIUM_SYNTHESIS_MODELS else None
    default_models = list(MODELS.keys())[:4] if MODELS else []
    
    return {
        "api_key": "", 
        "default_models": default_models, 
        "internal_paths": 4, 
        "synthesis_model": default_synthesis_model
    }

def save_config(config):
    """Save configuration to file"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def load_context():
    """Load project context from file"""
    if os.path.exists(CONTEXT_FILE):
        try:
            with open(CONTEXT_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"summary": "", "files": [], "last_updated": None}

def save_context(context):
    """Save project context to file"""
    with open(CONTEXT_FILE, 'w') as f:
        json.dump(context, f, indent=2)

def load_history():
    """Load query history from file"""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return []

def save_history(history):
    """Save query history to file"""
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def scan_project_directory(root_path, file_extensions):
    """Scan project directory and return file list with summaries"""
    files_data = []
    
    try:
        for root, dirs, files in os.walk(root_path):
            # Skip common non-code directories
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.venv', 'venv', 'build', 'dist']]
            
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1]
                
                if file_ext in file_extensions:
                    try:
                        # Get file stats
                        stat = os.stat(file_path)
                        size = stat.st_size
                        
                        # Read file content (limit to reasonable size)
                        if size < 100000:  # 100KB limit
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                
                            # Create basic summary
                            lines = len(content.split('\n'))
                            rel_path = os.path.relpath(file_path, root_path)
                            
                            files_data.append({
                                "path": rel_path,
                                "size": size,
                                "lines": lines,
                                "extension": file_ext,
                                "preview": content[:500] + "..." if len(content) > 500 else content
                            })
                    except Exception as e:
                        continue
                        
    except Exception as e:
        st.error(f"Error scanning directory: {e}")
        
    return files_data

async def query_model(session, model_id, prompt, context=""):
    """Query a single AI model via OpenRouter"""
    start_time = time.time()
    
    headers = {
        "Authorization": f"Bearer {st.session_state.config['api_key']}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8501",
        "X-Title": "MyUI ParaThinker Interface"
    }
    
    # Combine context and prompt
    full_prompt = f"{context}\n\n{prompt}" if context else prompt
    
    data = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant focused on providing accurate, actionable coding advice."},
            {"role": "user", "content": full_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    try:
        async with session.post(OPENROUTER_API, headers=headers, json=data) as resp:
            end_time = time.time()
            duration = end_time - start_time
            
            if resp.status == 200:
                result = await resp.json()
                content = result['choices'][0]['message']['content']
                
                # Estimate cost (rough approximation)
                token_count = len(full_prompt.split()) + len(content.split())
                estimated_cost = (token_count / 1000000) * MODELS[model_id]["cost"]
                
                return {
                    "model": model_id,
                    "model_name": MODELS[model_id]["name"],
                    "content": content,
                    "duration": duration,
                    "estimated_cost": estimated_cost,
                    "success": True,
                    "error": None
                }
            else:
                error_text = await resp.text()
                return {
                    "model": model_id,
                    "model_name": MODELS[model_id]["name"],
                    "content": "",
                    "duration": duration,
                    "estimated_cost": 0,
                    "success": False,
                    "error": f"HTTP {resp.status}: {error_text}"
                }
                
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        return {
            "model": model_id,
            "model_name": MODELS[model_id]["name"],
            "content": "",
            "duration": duration,
            "estimated_cost": 0,
            "success": False,
            "error": str(e)
        }

async def query_multiple_models(selected_models, prompt, context=""):
    """Query multiple models in parallel (Stage 1 of ParaThinker)"""
    async with aiohttp.ClientSession() as session:
        tasks = [query_model(session, model_id, prompt, context) for model_id in selected_models]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                processed_results.append({
                    "model": "unknown",
                    "model_name": "Unknown",
                    "content": "",
                    "duration": 0,
                    "estimated_cost": 0,
                    "success": False,
                    "error": str(result)
                })
            else:
                processed_results.append(result)
                
        return processed_results

def estimate_tokens(text):
    """More accurate token estimation based on character count and word boundaries"""
    # Rough approximation: ~4 characters per token for most models
    char_based = len(text) / 4
    word_based = len(text.split()) * 1.3  # Account for subword tokenization
    return int(max(char_based, word_based))

async def parathinker_synthesis(api_responses, original_prompt, synthesis_model, num_internal_paths, context=""):
    """
    Enhanced ParaThinker Stage 2: Generate diverse internal reasoning paths with unique referencing
    
    Incorporates advanced ParaThinker concepts:
    - Unique path referencing to mimic thought-specific positional embeddings
    - Diverse prompt phrasing for internal paths (mimics SFT variation)
    - KV-cache emulation through explicit reuse instructions
    - Better token management with accurate estimation
    - Pre-summarization when approaching model limits
    
    Args:
        api_responses: List of responses from Stage 1 (external API calls)
        original_prompt: The original user prompt
        synthesis_model: Model to use for synthesis (e.g., Claude)
        num_internal_paths: Number of internal <think> paths to generate (4-8)
        context: External project context
    
    Returns:
        Dict with internal_paths, final_synthesis, metadata, and token_info
    """
    
    # Filter successful responses for synthesis
    successful_responses = [r for r in api_responses if r["success"]]
    
    if not successful_responses:
        return {
            "internal_paths": [],
            "final_synthesis": "No successful responses to synthesize.",
            "success": False,
            "error": "No valid API responses"
        }
    
    # Prepare API responses with unique referencing (mimic embeddings)
    api_summary = ""
    path_references = []  # Track unique identifiers for each path
    
    for i, resp in enumerate(successful_responses):
        path_id = f"Path {i+1} ({resp['model_name']})"
        path_references.append({
            "id": i+1,
            "model": resp['model_name'],
            "provider": MODELS[resp['model']]['provider'] if resp['model'] in MODELS else "Unknown"
        })
        
        # Format with unique referencing for embedding simulation
        api_summary += f"\n=== {path_id} ===\n{resp['content']}\n"
    
    # More accurate token estimation
    total_content = context + original_prompt + api_summary
    estimated_tokens = estimate_tokens(total_content)
    
    # Get token limits from models config (dynamic)
    models_config = load_models_config()
    model_limit = 30000  # Default fallback
    
    if synthesis_model in models_config["models"]:
        model_limit = models_config["models"][synthesis_model].get("token_limit", 30000)
    token_threshold = int(model_limit * 0.8)  # Use 80% of limit for safety
    
    pre_summarized = False
    if estimated_tokens > token_threshold:
        # Pre-summarize with cheapest model - maintain unique references
        cheapest_model = get_cheapest_model()
        if cheapest_model:
            pre_summary_prompt = f"""Summarize these API responses while preserving unique path references and key insights:

Original Question: {original_prompt}

API Responses with Unique Paths:
{api_summary}

IMPORTANT: Maintain clear references to each path (e.g., "Path 1 (Claude): suggests X", "Path 2 (Model): recommends Y"). 
Preserve the core insights and unique perspectives from each model while reducing token count.
This summary will be used for ParaThinker synthesis."""

            try:
                async with aiohttp.ClientSession() as session:
                    summary_result = await query_model(session, cheapest_model, pre_summary_prompt)
                    if summary_result["success"]:
                        api_summary = summary_result["content"]
                        pre_summarized = True
            except Exception:
                pre_summarized = False  # Continue with original if summarization fails
    
    # Generate diverse internal path prompts with randomized phrasing (mimic SFT variation)
    # Base perspectives with multiple phrasing variants to prevent tunnel vision
    internal_path_variations = {
        "strengths": [
            "[Analyze the STRENGTHS and ADVANTAGES - what works exceptionally well across responses]",
            "[Identify POSITIVE ASPECTS and BENEFITS - highlight the most effective elements]", 
            "[Examine SUCCESS FACTORS - what makes these approaches particularly valuable]"
        ],
        "issues": [
            "[Examine POTENTIAL ISSUES and LIMITATIONS - identify risks and weaknesses]",
            "[Investigate PROBLEMS and CONSTRAINTS - what could hinder success]",
            "[Assess VULNERABILITIES and DRAWBACKS - critical concerns to address]"
        ],
        "implementation": [
            "[Focus on PRACTICAL IMPLEMENTATION - how to actually execute these ideas]",
            "[Consider EXECUTION STRATEGY - concrete steps to make this actionable]",
            "[Develop IMPLEMENTATION ROADMAP - practical path from concept to reality]"
        ],
        "alternatives": [
            "[Explore ALTERNATIVE STRATEGIES - different approaches not yet considered]",
            "[Generate CREATIVE OPTIONS - unconventional solutions and methods]",
            "[Consider DIVERSE APPROACHES - multiple pathways to achieve goals]"
        ],
        "edge_cases": [
            "[Investigate EDGE CASES and FAILURE MODES - what could go wrong and why]",
            "[Examine BOUNDARY CONDITIONS - scenarios where approaches might fail]",
            "[Analyze EXTREME SITUATIONS - stress-testing the proposed solutions]"
        ],
        "scalability": [
            "[Consider SCALABILITY and LONG-TERM IMPACT - sustainability and growth implications]",
            "[Evaluate FUTURE-PROOFING - how well will this work over time and scale]",
            "[Assess SUSTAINABILITY - long-term viability and expansion potential]"
        ],
        "efficiency": [
            "[Evaluate RESOURCE EFFICIENCY - cost, time, and optimization opportunities]",
            "[Analyze COST-BENEFIT RATIO - optimal resource allocation strategies]",
            "[Examine OPTIMIZATION POTENTIAL - ways to improve efficiency and reduce waste]"
        ],
        "innovation": [
            "[Generate NOVEL INSIGHTS - creative synthesis and innovative perspectives]",
            "[Explore BREAKTHROUGH OPPORTUNITIES - revolutionary approaches and ideas]",
            "[Consider PARADIGM SHIFTS - fundamentally different ways of thinking about this]"
        ]
    }
    
    # Randomly select prompt variations for each path (mimics SFT training diversity)
    perspective_keys = list(internal_path_variations.keys())
    selected_prompts = []
    
    for i in range(num_internal_paths):
        if i < len(perspective_keys):
            key = perspective_keys[i]
            # Randomly select one variation from this perspective's options
            variations = internal_path_variations[key]
            selected_prompt = random.choice(variations)
            selected_prompts.append(selected_prompt)
        else:
            # If we need more paths than defined perspectives, cycle through with random variations
            key = perspective_keys[i % len(perspective_keys)]
            variations = internal_path_variations[key]
            selected_prompt = random.choice(variations)
            selected_prompts.append(selected_prompt)
    
    # Build internal thinking section with diverse prompts
    thinking_section = ""
    for i, prompt_text in enumerate(selected_prompts, 1):
        thinking_section += f'<think i="{i}">\n{prompt_text}\n</think i="{i}">\n\n'
    
    # Generate enhanced ParaThinker synthesis prompt with KV-cache emulation
    parathinker_prompt = f"""You are implementing advanced ParaThinker reasoning with KV-cache optimization. Follow this enhanced two-stage process:

ORIGINAL QUESTION: {original_prompt}

EXTERNAL CONTEXT: {context}

STAGE 1 RESULTS (External Parallel Paths):
{api_summary}
{'[Note: Pre-summarized due to token limits]' if pre_summarized else ''}

UNIQUE PATH REFERENCES:
{chr(10).join([f'Path {ref["id"]}: {ref["model"]} ({ref["provider"]})' for ref in path_references])}

STAGE 2: Generate {num_internal_paths} diverse internal reasoning paths with unique referencing, then synthesize.

IMPORTANT INSTRUCTIONS:
- Use UNIQUE REFERENCES when citing external paths (e.g., "Path 1 (Claude): suggests X", "Path 2 (DeepSeek): indicates Y")
- REUSE the above external path information without repetition (KV-cache emulation)
- Each <think> path should have a DISTINCT analytical angle
- Reference specific quotes/insights from external paths when relevant

Generate your {num_internal_paths} internal reasoning paths:

{thinking_section}FINAL SYNTHESIS:
Now synthesize ALL perspectives (external paths + internal reasoning) into a comprehensive solution:

1. **Cross-Path Consensus**: What multiple paths (both external and internal) consistently agree on
2. **Unique Insights**: Distinctive perspectives found only in specific paths  
3. **Conflicting Viewpoints**: Where external/internal paths diverge and the implications
4. **Evidence-Based Recommendations**: Solutions backed by multiple path convergence
5. **Implementation Roadmap**: Concrete steps informed by collective path intelligence
6. **Risk Mitigation**: Potential issues identified across reasoning paths

IMPORTANT: Reference specific paths in your synthesis (e.g., "Path 1 (Claude) and Internal Path 3 both suggest...") to demonstrate unique path integration and avoid tunnel vision.

Focus on actionable insights that leverage the true parallel reasoning of all {len(successful_responses)} external + {num_internal_paths} internal paths."""

    # Execute ParaThinker synthesis
    try:
        async with aiohttp.ClientSession() as session:
            synthesis_result = await query_model(session, synthesis_model, parathinker_prompt)
            
            if synthesis_result["success"]:
                # Parse the response to extract internal paths and final synthesis
                content = synthesis_result["content"]
                
                # Extract internal thinking paths
                internal_paths = []
                import re
                think_pattern = r'<think i="(\d+)">(.*?)</think i="\1">'
                matches = re.findall(think_pattern, content, re.DOTALL)
                
                for i, (path_num, thinking) in enumerate(matches):
                    internal_paths.append({
                        "path_number": int(path_num),
                        "content": thinking.strip()
                    })
                
                # Extract final synthesis (everything after the last </think> tag)
                final_synthesis = content
                if matches:
                    last_think_end = content.rfind('</think i="')
                    if last_think_end != -1:
                        # Find the end of the last closing tag
                        tag_end = content.find('>', last_think_end)
                        if tag_end != -1:
                            final_synthesis = content[tag_end + 1:].strip()
                
                return {
                    "internal_paths": internal_paths,
                    "final_synthesis": final_synthesis,
                    "full_response": content,
                    "success": True,
                    "duration": synthesis_result["duration"],
                    "estimated_cost": synthesis_result["estimated_cost"],
                    "error": None,
                    "token_info": {
                        "estimated_input_tokens": estimated_tokens,
                        "model_limit": model_limit,
                        "pre_summarized": pre_summarized,
                        "external_paths": len(successful_responses),
                        "internal_paths": num_internal_paths
                    },
                    "path_references": path_references
                }
            else:
                return {
                    "internal_paths": [],
                    "final_synthesis": f"Synthesis failed: {synthesis_result['error']}",
                    "success": False,
                    "error": synthesis_result["error"],
                    "token_info": {
                        "estimated_input_tokens": estimated_tokens,
                        "model_limit": model_limit,
                        "pre_summarized": pre_summarized
                    }
                }
                
    except Exception as e:
        return {
            "internal_paths": [],
            "final_synthesis": f"Synthesis error: {str(e)}",
            "success": False,
            "error": str(e),
            "token_info": {
                "estimated_input_tokens": estimated_tokens if 'estimated_tokens' in locals() else 0,
                "error_during": "synthesis_execution"
            }
        }

def get_cheapest_model():
    """Get the cheapest available model for utility tasks"""
    if not MODELS:
        return None
    
    # Find the cheapest model
    cheapest = min(MODELS.items(), key=lambda x: x[1]["cost"])
    return cheapest[0]

def run_async_safely(coro):
    """Safely run async code in Streamlit environment"""
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
        # If there's already a running loop, use thread executor
        with concurrent.futures.ThreadPoolExecutor() as executor:
            return executor.submit(asyncio.run, coro).result()
    except RuntimeError:
        # No running loop, safe to use asyncio.run
        return asyncio.run(coro)

def export_results_to_markdown(prompt, responses, parathinker_result, timestamp):
    """Export query results including ParaThinker analysis to markdown file"""
    filename = f"myui_parathinker_export_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
    
    content = f"""# MyUI ParaThinker Results - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

## Original Prompt
```
{prompt}
```

## Stage 1: External API Responses

"""
    
    for response in responses:
        if response["success"]:
            content += f"""### {response["model_name"]}
**Duration:** {response["duration"]:.2f}s | **Cost:** ${response["estimated_cost"]:.4f}

```
{response["content"]}
```

---

"""
        else:
            content += f"""### {response["model_name"]} (Error)
**Error:** {response["error"]}

---

"""
    
    if parathinker_result and parathinker_result.get("success"):
        token_info = parathinker_result.get("token_info", {})
        path_refs = parathinker_result.get("path_references", [])
        
        content += f"""## Stage 2: Enhanced ParaThinker Analysis

### Path Reference Map
"""        
        for ref in path_refs:
            content += f"- **Path {ref['id']}**: {ref['model']} ({ref['provider']})\n"
        
        content += f"""\n### Internal Reasoning Paths ({len(parathinker_result.get('internal_paths', []))} paths)

"""
        
        # Add internal paths with enhanced formatting
        for path in parathinker_result.get("internal_paths", []):
            content += f"""#### Internal Path {path["path_number"]} - Diverse Perspective
```
{path["content"]}
```

"""
        
        content += f"""## Final ParaThinker Synthesis

{parathinker_result.get("final_synthesis", "")}

---

### Technical Details
- **External Paths**: {token_info.get('external_paths', 'Unknown')}
- **Internal Paths**: {token_info.get('internal_paths', 'Unknown')}
- **Input Tokens**: ~{token_info.get('estimated_input_tokens', 0):,}
- **Pre-summarized**: {'Yes' if token_info.get('pre_summarized') else 'No'}
- **ParaThinker Cost**: ${parathinker_result.get("estimated_cost", 0):.4f}
- **Duration**: {parathinker_result.get("duration", 0):.2f}s

*Generated by Enhanced MyUI ParaThinker Multi-AI Interface*
*Implements unique referencing, KV-cache emulation, and diverse path synthesis*
"""
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
        
    return filename

# Initialize models from config file FIRST  
if not MODELS:  # Only initialize once
    models_config = initialize_models()

# Initialize session state
if 'config' not in st.session_state:
    st.session_state.config = load_config()
if 'context' not in st.session_state:
    st.session_state.context = load_context()
if 'history' not in st.session_state:
    st.session_state.history = load_history()
if 'responses' not in st.session_state:
    st.session_state.responses = None
if 'parathinker_result' not in st.session_state:
    st.session_state.parathinker_result = None

# Sidebar - Prompt Input and Configuration
with st.sidebar:
    st.title("🧠 MyUI ParaThinker")
    
    # API Key Configuration
    st.subheader("⚙️ Configuration")
    api_key = st.text_input(
        "OpenRouter API Key:", 
        value=st.session_state.config.get('api_key', ''), 
        type="password",
        help="Get your API key from https://openrouter.ai/keys"
    )
    
    if api_key != st.session_state.config.get('api_key', ''):
        st.session_state.config['api_key'] = api_key
        save_config(st.session_state.config)
    
    # Model Config Reload Button
    col1, col2 = st.columns([3, 1])
    with col1:
        st.caption(f"📋 Models: {len(MODELS)} total, {len(PREMIUM_SYNTHESIS_MODELS)} for Stage 2")
    with col2:
        if st.button("🔄", help="Reload models from myui_models.json"):
            # Force reload models (no global needed at module level)
            MODELS.clear()
            PREMIUM_SYNTHESIS_MODELS.clear()
            models_config = initialize_models()
            st.success("✅ Models reloaded!")
            st.rerun()
    
    # ParaThinker Configuration
    col1, col2 = st.columns(2)
    with col1:
        panel_count = st.select_slider(
            "External Paths:",
            options=[4, 5, 6],
            value=4,
            help="Number of external API models (Stage 1)"
        )
    
    with col2:
        internal_paths = st.select_slider(
            "Internal Paths:",
            options=[4, 6, 8],
            value=st.session_state.config.get('internal_paths', 4),
            help="Number of internal reasoning paths (Stage 2)"
        )
        
        if internal_paths != st.session_state.config.get('internal_paths', 4):
            st.session_state.config['internal_paths'] = internal_paths
            save_config(st.session_state.config)
    
    st.divider()
    
    # Prompt input
    st.subheader("💭 Prompt Input")
    prompt = st.text_area(
        "Enter your prompt/question/PRD:",
        height=200,
        placeholder="Enter your coding question, analysis request, or problem description..."
    )
    
    # Stage 2 Model Selection (below prompt as requested)
    st.subheader("🎯 Stage 2: Synthesis Model")
    
    if not PREMIUM_SYNTHESIS_MODELS:
        st.error("❌ No Stage 2 models configured! Please edit myui_models.json")
        synthesis_model = None
    else:
        # Ensure the saved model is still available
        saved_model = st.session_state.config.get('synthesis_model')
        if saved_model not in PREMIUM_SYNTHESIS_MODELS:
            saved_model = PREMIUM_SYNTHESIS_MODELS[0]
            
        synthesis_model = st.selectbox(
            "Premium Synthesis Model:",
            options=PREMIUM_SYNTHESIS_MODELS,
            format_func=lambda x: f"{MODELS[x]['name']} (${MODELS[x]['cost']}/M)",
            index=PREMIUM_SYNTHESIS_MODELS.index(saved_model),
            help="Select premium model for Stage 2 ParaThinker synthesis. Models configured in myui_models.json"
        )
    
    # Save synthesis model selection
    if synthesis_model != st.session_state.config.get('synthesis_model'):
        st.session_state.config['synthesis_model'] = synthesis_model
        save_config(st.session_state.config)
    
    # Context management
    st.subheader("📁 Project Context")
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🔄 Scan Project"):
            with st.spinner("Scanning project..."):
                # File type selection
                file_extensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.md', '.txt', '.json', '.yml', '.yaml']
                
                # Scan current directory
                files_data = scan_project_directory(".", file_extensions)
                
                if files_data:
                    # Create summary using DeepSeek (cheapest model)
                    context_prompt = f"""Analyze this project structure and create a concise summary:

Files found: {len(files_data)}
File types: {list(set([f['extension'] for f in files_data]))}

Key files preview:
{json.dumps(files_data[:10], indent=2)}

Create a summary that includes:
1. Project type and technology stack
2. Main components and structure  
3. Key files and their purposes
4. Overall architecture pattern

Keep it concise but informative for AI context."""

                    # Use cheapest model for context generation
                    cheapest_model = get_cheapest_model()
                    if st.session_state.config.get('api_key') and cheapest_model:
                        try:
                            import asyncio
                            
                            async def get_context():
                                async with aiohttp.ClientSession() as session:
                                    return await query_model(session, cheapest_model, context_prompt)
                            
                            # Handle existing event loop properly
                            context_result = run_async_safely(get_context())
                            
                            if context_result["success"]:
                                context_data = {
                                    "summary": context_result["content"],
                                    "files": files_data,
                                    "last_updated": datetime.now().isoformat(),
                                    "file_count": len(files_data)
                                }
                                save_context(context_data)
                                st.session_state.context = context_data
                                st.success(f"✅ Scanned {len(files_data)} files")
                            else:
                                st.error(f"Context generation failed: {context_result['error']}")
                        except Exception as e:
                            st.error(f"Context generation error: {e}")
                    elif not cheapest_model:
                        st.warning("⚠️ No models available for AI context generation")
                        # Save without AI summary
                        context_data = {
                            "summary": f"Project with {len(files_data)} files (no AI analysis - no models configured)",
                            "files": files_data,
                            "last_updated": datetime.now().isoformat(),
                            "file_count": len(files_data)
                        }
                        save_context(context_data)
                        st.session_state.context = context_data
                        st.success(f"✅ Scanned {len(files_data)} files (no AI summary)")
                    else:
                        # Save without AI summary
                        context_data = {
                            "summary": f"Project with {len(files_data)} files",
                            "files": files_data,
                            "last_updated": datetime.now().isoformat(),
                            "file_count": len(files_data)
                        }
                        save_context(context_data)
                        st.session_state.context = context_data
                        st.success(f"✅ Scanned {len(files_data)} files (no AI summary)")
                else:
                    st.warning("No supported files found")
    
    with col2:
        use_context = st.checkbox("Include Context", value=True)
    
    # Show context info
    if st.session_state.context.get('summary'):
        st.info(f"📊 Context: {st.session_state.context.get('file_count', 0)} files")
        with st.expander("View Context"):
            st.write(st.session_state.context['summary'][:500] + "..." if len(st.session_state.context['summary']) > 500 else st.session_state.context['summary'])
    
    st.divider()
    
    # Query button
    if st.button("🚀 Start ParaThinker", type="primary", disabled=not api_key or not prompt):
        if not api_key:
            st.error("Please enter your OpenRouter API key")
        elif not prompt:
            st.error("Please enter a prompt")
        else:
            # Get selected models for each panel
            selected_models = st.session_state.get('selected_models', list(MODELS.keys())[:panel_count])
            
            # Prepare context
            context = ""
            if use_context and st.session_state.context.get('summary'):
                context = f"PROJECT CONTEXT:\n{st.session_state.context['summary']}\n\n"
            
            with st.spinner("Stage 1: Querying external models in parallel..."):
                try:
                    responses = run_async_safely(query_multiple_models(selected_models, prompt, context))
                    st.session_state.responses = responses
                    st.success("✅ Stage 1 completed!")
                    
                except Exception as e:
                    st.error(f"Stage 1 failed: {e}")

# Main content area
st.title("ParaThinker Multi-AI Interface")

# Model selection for each panel
if st.session_state.config.get('api_key'):
    st.subheader("🎛️ Stage 1: External Model Selection")
    
    if not MODELS:
        st.error("❌ No Stage 1 models configured! Please check myui_models.json")
    else:
        # Filter models enabled for Stage 1
        models_config = load_models_config()
        stage1_models = [model_id for model_id, model_data in models_config["models"].items() 
                        if model_data.get("stage1_enabled", True)]
        
        if not stage1_models:
            st.error("❌ No models enabled for Stage 1! Please edit myui_models.json and set stage1_enabled: true for some models")
        else:
            cols = st.columns(panel_count)
            selected_models = []
            
            for i in range(panel_count):
                with cols[i]:
                    default_model = stage1_models[i % len(stage1_models)]
                    
                    selected_model = st.selectbox(
                        f"Path {i+1}:",
                        options=stage1_models,
                        format_func=lambda x: f"{MODELS[x]['name']} (${MODELS[x]['cost']}/M)",
                        index=stage1_models.index(default_model),
                        key=f"model_select_{i}"
                    )
                    selected_models.append(selected_model)
            
            st.session_state.selected_models = selected_models
    st.divider()

# Display responses
if st.session_state.responses:
    responses = st.session_state.responses
    
    # Summary stats
    successful = [r for r in responses if r["success"]]
    total_cost = sum(r["estimated_cost"] for r in successful)
    avg_time = sum(r["duration"] for r in successful) / len(successful) if successful else 0
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Stage 1 Success", f"{len(successful)}/{len(responses)}")
    with col2:
        st.metric("Stage 1 Cost", f"${total_cost:.4f}")
    with col3:
        st.metric("Avg Response Time", f"{avg_time:.2f}s")
    with col4:
        if st.session_state.parathinker_result:
            if st.button("💾 Export ParaThinker Results"):
                filename = export_results_to_markdown(
                    st.session_state.history[0]["prompt"] if st.session_state.history else "No prompt", 
                    responses, 
                    st.session_state.parathinker_result, 
                    datetime.now()
                )
                st.success(f"✅ Exported to {filename}")
    
    # Response panels
    cols = st.columns(len(responses))
    
    for i, response in enumerate(responses):
        with cols[i]:
            # Panel header
            if response["success"]:
                st.success(f"✅ {response['model_name']}")
                st.caption(f"⏱️ {response['duration']:.2f}s | 💰 ${response['estimated_cost']:.4f}")
            else:
                st.error(f"❌ {response['model_name']}")
                st.caption(f"Error: {response['error'][:50]}...")
            
            # Response content
            if response["success"]:
                st.text_area(
                    "Response:",
                    value=response["content"],
                    height=300,
                    key=f"response_{i}",
                    disabled=True
                )
            else:
                st.error(f"Query failed: {response['error']}")
    
    st.divider()
    
    # ParaThinker Stage 2
    st.subheader("🧠 Stage 2: ParaThinker Synthesis")
    
    col1, col2, col3 = st.columns([2, 2, 1])
    
    with col1:
        selected_synthesis_model = st.session_state.config.get('synthesis_model')
        if selected_synthesis_model and selected_synthesis_model in MODELS:
            st.info(f"🎯 Selected: {MODELS[selected_synthesis_model]['name']}")
        else:
            st.warning("⚠️ No synthesis model selected or model not found")
    
    with col2:
        st.info(f"🧠 Internal Paths: {internal_paths} (randomized perspectives)")
    
    with col3:
        if st.button("🚀 Run ParaThinker", type="primary"):
            context = ""
            if st.session_state.context.get('summary'):
                context = f"PROJECT CONTEXT:\n{st.session_state.context['summary']}\n\n"
            
            # Get the selected synthesis model from config
            selected_synthesis_model = st.session_state.config.get('synthesis_model')
            if not selected_synthesis_model or selected_synthesis_model not in MODELS:
                st.error("❌ No valid synthesis model selected! Please configure a Stage 2 model.")
            else:
                with st.spinner(f"Stage 2: Generating {internal_paths} randomized internal reasoning paths + synthesis..."):
                    try:
                        parathinker_result = run_async_safely(parathinker_synthesis(
                            responses, 
                            prompt if 'prompt' in locals() else "Unknown prompt",
                            selected_synthesis_model,
                            internal_paths,
                            context
                        ))
                        
                        st.session_state.parathinker_result = parathinker_result
                        
                        if parathinker_result["success"]:
                            st.success("✅ ParaThinker synthesis completed with randomized perspectives!")
                        else:
                            st.error(f"ParaThinker failed: {parathinker_result['error']}")
                            
                    except Exception as e:
                        st.error(f"ParaThinker error: {e}")
    
    # Display ParaThinker results
    if st.session_state.parathinker_result:
        result = st.session_state.parathinker_result
        
        if result["success"]:
            # Enhanced metadata display
            token_info = result.get("token_info", {})
            path_refs = result.get("path_references", [])
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Stage 2 Cost", f"${result.get('estimated_cost', 0):.4f}")
            with col2:
                st.metric("Duration", f"{result.get('duration', 0):.2f}s")
            with col3:
                st.metric("Input Tokens", f"~{token_info.get('estimated_input_tokens', 0):,}")
            with col4:
                pre_sum_status = "Yes" if token_info.get('pre_summarized') else "No"
                st.metric("Pre-summarized", pre_sum_status)
            
            # Display results using expanders for better readability (as requested)
            st.subheader("📋 ParaThinker Results")
            
            # Final Synthesis Expander (primary result)
            with st.expander("🔬 Final ParaThinker Synthesis", expanded=True):
                st.text_area(
                    "Comprehensive Multi-Path Analysis:",
                    value=result.get("final_synthesis", "No synthesis available"),
                    height=400,
                    key="final_synthesis_display",
                    disabled=True
                )
                
                # Show synthesis metadata
                col_a, col_b = st.columns(2)
                with col_a:
                    selected_model = st.session_state.config.get('synthesis_model')
                    model_name = MODELS[selected_model]['name'] if selected_model and selected_model in MODELS else "Unknown"
                    st.caption(f"🎯 Synthesis Model: {model_name}")
                with col_b:
                    st.caption(f"🔗 Path Integration: {token_info.get('external_paths', 0)} external + {token_info.get('internal_paths', 0)} internal")
            
            # Internal Paths Expander (randomized perspectives)
            with st.expander(f"🧠 Internal Reasoning Paths ({len(result.get('internal_paths', []))} randomized perspectives)", expanded=False):
                if result.get("internal_paths"):
                    st.info("💡 **Randomized Perspectives**: Each path uses randomly selected prompt variations to mimic SFT training diversity and prevent tunnel vision.")
                    
                    # Show internal path distribution with randomization note
                    path_types = ["Strengths", "Issues", "Implementation", "Alternatives", "Edge Cases", "Scalability", "Resources", "Innovation"]
                    
                    for i, path in enumerate(result["internal_paths"]):
                        path_type = path_types[path['path_number']-1] if path['path_number']-1 < len(path_types) else "Analysis"
                        
                        # Sub-expander for each internal path
                        with st.expander(f"🔍 Internal Path {path['path_number']}: {path_type} Perspective (Randomized)", expanded=False):
                            st.text_area(
                                f"Reasoning Content:",
                                value=path["content"],
                                height=180,
                                key=f"internal_path_{path['path_number']}",
                                disabled=True
                            )
                            
                            # Show path metadata with randomization info
                            st.caption(f"📊 Perspective: {path_type} | Path ID: {path['path_number']} | 🎲 Randomized Prompt Variation")
                else:
                    st.warning("No internal paths extracted. The model may not have used the <think i=\"N\"> tag format. Check full output below.")
            
            # Path References Expander (unique mapping system)
            with st.expander("🔗 Path Reference Map (Unique Identifiers)", expanded=False):
                if path_refs:
                    st.markdown("**External Path Reference System** (mimics thought-specific positional embeddings):")
                    
                    # Display path references in a more structured way
                    for ref in path_refs:
                        col_x, col_y = st.columns([1, 3])
                        with col_x:
                            st.markdown(f"**Path {ref['id']}**")
                        with col_y:
                            st.markdown(f"`{ref['model']}` ({ref['provider']})")
                    
                    st.info("💡 **Unique Referencing System**: ParaThinker uses these specific path identifiers throughout synthesis to avoid ambiguity, prevent tunnel vision, and simulate the thought-specific positional embeddings described in the research paper.")
                    st.caption("🔬 This mimics the native ParaThinker architecture's ability to distinguish between different reasoning paths during KV-cache reuse.")
                else:
                    st.warning("No path references available - this may indicate an issue with Stage 1 processing.")
            
            # Full Output Expander (raw response and technical details)
            with st.expander("📄 Complete Raw Output & Technical Details", expanded=False):
                # Pre-summarization warning if applicable
                if token_info.get('pre_summarized'):
                    st.warning(f"⚠️ Input was pre-summarized due to token limit ({token_info.get('model_limit', 'unknown')} tokens). Original content was ~{token_info.get('estimated_input_tokens', 0):,} tokens.")
                
                # Raw model output
                st.text_area(
                    "Raw Model Output (includes all <think i=\"N\"> tags and synthesis):",
                    value=result.get("full_response", "No full response available"),
                    height=500,
                    key="raw_output_display",
                    disabled=True
                )
                
                # Technical details in a sub-expander
                with st.expander("🔧 ParaThinker Technical Metadata"):
                    tech_details = {
                        "external_paths_count": token_info.get('external_paths', 0),
                        "internal_paths_count": token_info.get('internal_paths', 0),
                        "estimated_input_tokens": token_info.get('estimated_input_tokens', 0),
                        "model_token_limit": token_info.get('model_limit', 0),
                        "pre_summarized": token_info.get('pre_summarized', False),
                        "synthesis_model": st.session_state.config.get('synthesis_model', 'unknown'),
                        "kv_cache_emulation": "Enabled (explicit reuse instructions)",
                        "unique_referencing": "Enabled (path-specific citations)",
                        "randomized_perspectives": "Enabled (SFT variation mimicry)",
                        "tunnel_vision_prevention": "Active (parallel diverse reasoning)"
                    }
                    st.json(tech_details)
                    st.caption("🔬 These technical details show how the ParaThinker emulation implements key concepts from the research paper.")
        else:
            st.error(f"ParaThinker synthesis failed: {result.get('error', 'Unknown error')}")

else:
    # Welcome message
    st.info("""
    👋 **Welcome to Enhanced MyUI ParaThinker Interface!**
    
    This tool implements advanced ParaThinker reasoning concepts from the research paper:
    
    **Stage 1 (External Parallel Paths):**
    - Query 4-6 different AI models simultaneously with unique path identification
    - Each external path provides distinct perspectives (DeepSeek, Claude, GPT, etc.)
    - Automatic token management with intelligent pre-summarization
    
    **Stage 2 (Internal Reasoning + KV-Cache Emulation):**
    - Generate 4-8 diverse internal reasoning paths using <think i="N"> tokens
    - **Randomized perspective prompts** mimic SFT training variation (prevents tunnel vision)
    - Unique referencing system mimics thought-specific positional embeddings  
    - KV-cache optimization through explicit reuse instructions
    - Premium model selection for optimal synthesis quality
    
    **Advanced Features:**
    ✨ **Unique Path Referencing**: Each path gets specific identifiers ("Path 1 (Claude): suggests X")
    🧠 **Diverse Internal Prompts**: 8 distinct analytical perspectives (strengths, risks, implementation, etc.)
    ⚡ **Smart Token Management**: Automatic pre-summarization when approaching model limits
    📊 **Enhanced Metadata**: Token counts, path mappings, and technical details
    💾 **Rich Export**: Comprehensive markdown with path references and technical info
    
    **Getting Started:**
    1. Enter your OpenRouter API key in the sidebar
    2. Configure external paths (4-6) and internal paths (4-8) 
    3. **Select premium synthesis model** below prompt (Claude recommended)
    4. Choose diverse Stage 1 models for maximum perspective variety
    5. Enter your prompt and click "Start ParaThinker"
    6. Run Stage 2 synthesis with randomized internal perspectives
    7. Explore results in organized expandable sections
    """)

# Query history (collapsible)
if st.session_state.history:
    with st.expander(f"📚 Query History ({len(st.session_state.history)} queries)"):
        for i, entry in enumerate(st.session_state.history[:5]):  # Show last 5
            timestamp = datetime.fromisoformat(entry["timestamp"]).strftime("%Y-%m-%d %H:%M")
            prompt_preview = entry["prompt"][:100] + "..." if len(entry["prompt"]) > 100 else entry["prompt"]
            
            if st.button(f"🔄 Reload: {timestamp} - {prompt_preview}", key=f"history_{i}"):
                # Reload this query
                st.session_state.responses = entry["responses"]
                st.rerun()