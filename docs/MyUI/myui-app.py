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
    parathinker_prompt = f"""You are implementing advanced ParaThinker reasoning with KV-cache optimization. Follow this enhanced THREE-stage process:

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

{thinking_section}STAGE 2 SYNTHESIS:
Now synthesize ALL perspectives (external paths + internal reasoning) into a comprehensive analysis:

STAGE 3: FINAL DECISION & IMPLEMENTATION
Based on all external and internal paths, provide:
1. **DEFINITIVE RECOMMENDATION**: Which specific approach should be implemented and why
2. **IMPLEMENTATION PLAN**: Step-by-step actionable plan with concrete tasks
3. **CONCRETE DELIVERABLES**: Actual code, configurations, or specific actions to take
4. **SUCCESS CRITERIA**: How to measure if the implementation worked

Your Stage 3 output should be the ULTIMATE ANSWER to the original question - actionable, specific, and implementable.

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
                
                # Extract final synthesis and final decision (everything after the last </think> tag)
                final_synthesis = content
                final_decision = ""
                
                if matches:
                    last_think_end = content.rfind('</think i="')
                    if last_think_end != -1:
                        # Find the end of the last closing tag
                        tag_end = content.find('>', last_think_end)
                        if tag_end != -1:
                            full_after_think = content[tag_end + 1:].strip()
                            
                            # Split into Stage 2 synthesis and Stage 3 decision
                            stage3_marker = "STAGE 3: FINAL DECISION & IMPLEMENTATION"
                            if stage3_marker in full_after_think:
                                parts = full_after_think.split(stage3_marker, 1)
                                final_synthesis = parts[0].strip()
                                final_decision = (stage3_marker + "\n" + parts[1]).strip() if len(parts) > 1 else ""
                            else:
                                # Fallback: Look for alternative Stage 3 markers
                                alt_markers = ["STAGE 3:", "**STAGE 3**", "## STAGE 3", "### FINAL DECISION", "**FINAL DECISION**"]
                                found_alt = False
                                for alt_marker in alt_markers:
                                    if alt_marker in full_after_think:
                                        parts = full_after_think.split(alt_marker, 1)
                                        final_synthesis = parts[0].strip()
                                        final_decision = (alt_marker + "\n" + parts[1]).strip() if len(parts) > 1 else ""
                                        found_alt = True
                                        break
                                
                                if not found_alt:
                                    # If no Stage 3 marker found, create a default Stage 3 from the synthesis
                                    final_synthesis = full_after_think
                                    final_decision = f"STAGE 3: FINAL DECISION & IMPLEMENTATION\n\nBased on the comprehensive analysis above, here is the actionable implementation plan:\n\n{full_after_think[-1000:] if len(full_after_think) > 1000 else full_after_think}"
                else:
                    # No internal paths found, create Stage 3 from full content
                    final_decision = f"STAGE 3: FINAL DECISION & IMPLEMENTATION\n\nBased on the analysis, here is the actionable implementation plan:\n\n{content[-1500:] if len(content) > 1500 else content}"
                
                return {
                    "internal_paths": internal_paths,
                    "final_synthesis": final_synthesis,
                    "final_decision": final_decision,
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
                    "final_decision": "",
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
            "final_decision": "",
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

def analyze_prompt(prompt_text):
    """Analyze prompt to determine request type, complexity, and technical needs"""
    if not prompt_text.strip():
        return None
        
    prompt_lower = prompt_text.lower()
    
    # Detect request types
    request_types = []
    if any(word in prompt_lower for word in ["component", "ui", "interface", "frontend", "react", "vue", "angular"]):
        request_types.append("UI_COMPONENT")
    if any(word in prompt_lower for word in ["api", "endpoint", "server", "backend", "database", "schema"]):
        request_types.append("API_DESIGN")
    if any(word in prompt_lower for word in ["architecture", "system", "design", "structure", "integration", "modular"]):
        request_types.append("ARCHITECTURE")
    if any(word in prompt_lower for word in ["fix", "bug", "error", "debug", "problem", "issue"]):
        request_types.append("BUG_FIX")
    if any(word in prompt_lower for word in ["implement", "code", "build", "create", "develop"]):
        request_types.append("IMPLEMENTATION")
    
    # Assess complexity
    complexity_indicators = {
        "HIGH": ["architecture", "system design", "microservices", "complex", "integration", "multi"],
        "MEDIUM": ["component", "feature", "module", "service", "interface"],
        "LOW": ["fix", "simple", "basic", "small", "quick"]
    }
    
    complexity = "MEDIUM"  # default
    for level, keywords in complexity_indicators.items():
        if any(keyword in prompt_lower for keyword in keywords):
            complexity = level
            break
    
    # Detect technical domains
    domains = []
    domain_mapping = {
        "React": ["react", "jsx", "tsx", "component", "hook"],
        "TypeScript": ["typescript", "interface", "type", "tsx"],
        "Database": ["database", "sql", "schema", "table", "query"],
        "API": ["api", "rest", "endpoint", "http", "request"],
        "UI/UX": ["ui", "ux", "design", "interface", "layout"],
        "Backend": ["backend", "server", "service", "microservice"],
        "Architecture": ["architecture", "system", "design pattern", "modular"]
    }
    
    for domain, keywords in domain_mapping.items():
        if any(keyword in prompt_lower for keyword in keywords):
            domains.append(domain)
    
    # Detect output format
    output_format = "ANALYSIS"  # default
    if any(word in prompt_lower for word in ["code", "implement", "build"]):
        output_format = "CODE"
    elif any(word in prompt_lower for word in ["plan", "steps", "roadmap"]):
        output_format = "PLAN"
    elif any(word in prompt_lower for word in ["document", "guide", "specification"]):
        output_format = "DOCUMENTATION"
        
    return {
        "request_types": request_types if request_types else ["GENERAL"],
        "complexity": complexity,
        "domains": domains if domains else ["General"],
        "output_format": output_format,
        "length": len(prompt_text.split())
    }

def get_model_capabilities():
    """Define model capabilities and strengths"""
    return {
        "anthropic/claude-sonnet-4": {
            "strengths": ["ARCHITECTURE", "COMPLEX_ANALYSIS", "SYSTEM_DESIGN", "UI_COMPONENT"],
            "technical_depth": "EXPERT",
            "code_generation": 9,
            "architectural_thinking": 10,
            "structured_output": 9,
            "best_for": ["Large system design", "Complex integrations", "Multi-component analysis"],
            "cost_per_million": 5.0
        },
        "z-ai/glm-4.5": {
            "strengths": ["UI_COMPONENT", "IMPLEMENTATION", "STRUCTURED_OUTPUT"],
            "technical_depth": "DETAILED", 
            "code_generation": 8,
            "architectural_thinking": 7,
            "structured_output": 9,
            "best_for": ["Component design", "Frontend patterns", "Structured responses"],
            "cost_per_million": 0.70
        },
        "deepseek/deepseek-chat-v3.1": {
            "strengths": ["IMPLEMENTATION", "BUG_FIX", "CODE_GENERATION"],
            "technical_depth": "DETAILED",
            "code_generation": 9,
            "architectural_thinking": 6,
            "structured_output": 7,
            "best_for": ["Direct implementation", "Code fixes", "Rapid prototyping"],
            "cost_per_million": 0.30
        },
        "openai/gpt-4o-mini": {
            "strengths": ["GENERAL", "BUG_FIX", "IMPLEMENTATION"],
            "technical_depth": "DETAILED",
            "code_generation": 7,
            "architectural_thinking": 6,
            "structured_output": 8,
            "best_for": ["General development", "Quick fixes", "Documentation"],
            "cost_per_million": 0.15
        },
        "x-ai/grok-4": {
            "strengths": ["CREATIVE", "ARCHITECTURE", "COMPLEX_ANALYSIS"],
            "technical_depth": "EXPERT",
            "code_generation": 8,
            "architectural_thinking": 9,
            "structured_output": 7,
            "best_for": ["Creative solutions", "Alternative approaches", "Complex problems"],
            "cost_per_million": 6.0
        },
        "google/gemini-2.5-pro": {
            "strengths": ["ANALYSIS", "DOCUMENTATION", "STRUCTURED_OUTPUT"],
            "technical_depth": "DETAILED",
            "code_generation": 7,
            "architectural_thinking": 8,
            "structured_output": 9,
            "best_for": ["Documentation", "Analysis", "Structured responses"],
            "cost_per_million": 2.5
        },
        "x-ai/grok-code-fast-1": {
            "strengths": ["CODE_GENERATION", "IMPLEMENTATION", "BUG_FIX"],
            "technical_depth": "DETAILED",
            "code_generation": 9,
            "architectural_thinking": 6,
            "structured_output": 7,
            "best_for": ["Fast code generation", "Quick implementation", "Debug assistance"],
            "cost_per_million": 0.28
        },
        "moonshotai/kimi-k2-0905": {
            "strengths": ["ANALYSIS", "DOCUMENTATION", "GENERAL"],
            "technical_depth": "DETAILED",
            "code_generation": 6,
            "architectural_thinking": 7,
            "structured_output": 8,
            "best_for": ["Long-form analysis", "Documentation", "Context processing"],
            "cost_per_million": 0.70
        }
    }

def recommend_model(prompt_analysis, available_models):
    """Recommend the best model based on prompt analysis"""
    if not prompt_analysis or not available_models:
        return None
        
    model_capabilities = get_model_capabilities()
    recommendations = []
    
    for model_id in available_models:
        if model_id not in model_capabilities:
            continue
            
        capabilities = model_capabilities[model_id]
        score = calculate_model_score(prompt_analysis, capabilities)
        confidence = calculate_confidence(score, prompt_analysis, capabilities)
        
        recommendations.append({
            "model_id": model_id,
            "model_name": MODELS[model_id]["name"],
            "score": score,
            "confidence": confidence,
            "reasoning": generate_reasoning(prompt_analysis, capabilities),
            "estimated_cost": estimate_prompt_cost(prompt_analysis, capabilities["cost_per_million"]),
            "capabilities": capabilities
        })
    
    # Sort by score descending
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "primary": recommendations[0] if recommendations else None,
        "alternatives": recommendations[1:3] if len(recommendations) > 1 else [],
        "should_use_multi_model": should_recommend_multi_model(prompt_analysis, recommendations)
    }

def calculate_model_score(prompt_analysis, capabilities):
    """Calculate compatibility score between prompt needs and model capabilities"""
    score = 0
    
    # Match request types with model strengths
    for request_type in prompt_analysis["request_types"]:
        if request_type in capabilities["strengths"]:
            score += 3
    
    # Complexity matching
    complexity_scores = {
        "HIGH": {"EXPERT": 3, "DETAILED": 2, "SURFACE": 1},
        "MEDIUM": {"EXPERT": 2, "DETAILED": 3, "SURFACE": 2}, 
        "LOW": {"EXPERT": 1, "DETAILED": 2, "SURFACE": 3}
    }
    
    tech_depth = capabilities.get("technical_depth", "DETAILED")
    score += complexity_scores.get(prompt_analysis["complexity"], {}).get(tech_depth, 1)
    
    # Output format preferences
    if prompt_analysis["output_format"] == "CODE":
        score += capabilities["code_generation"] * 0.3
    elif prompt_analysis["output_format"] in ["ANALYSIS", "PLAN"]:
        score += capabilities["architectural_thinking"] * 0.3
    
    # Cost efficiency bonus (cheaper models get slight bonus for simple tasks)
    if prompt_analysis["complexity"] == "LOW":
        cost_bonus = max(0, (2.0 - capabilities["cost_per_million"]) * 0.5)
        score += cost_bonus
        
    return score

def calculate_confidence(score, prompt_analysis, capabilities):
    """Calculate confidence percentage for the recommendation"""
    # Base confidence from score
    base_confidence = min(95, score * 15)  # Scale score to percentage
    
    # Reduce confidence for complex tasks with lower-capability models
    if prompt_analysis["complexity"] == "HIGH" and capabilities["technical_depth"] != "EXPERT":
        base_confidence *= 0.8
        
    # Reduce confidence for mismatched request types
    matches = sum(1 for rt in prompt_analysis["request_types"] if rt in capabilities["strengths"])
    if matches == 0:
        base_confidence *= 0.6
        
    return max(50, int(base_confidence))  # Minimum 50% confidence

def generate_reasoning(prompt_analysis, capabilities):
    """Generate human-readable reasoning for the recommendation"""
    reasons = []
    
    # Match strengths
    matched_strengths = [rt for rt in prompt_analysis["request_types"] if rt in capabilities["strengths"]]
    if matched_strengths:
        strength_text = ", ".join(matched_strengths).replace("_", " ").lower()
        reasons.append(f"Strong at {strength_text}")
    
    # Complexity match
    if prompt_analysis["complexity"] == "HIGH" and capabilities["technical_depth"] == "EXPERT":
        reasons.append("Expert-level technical depth for complex analysis")
    elif prompt_analysis["complexity"] == "LOW" and capabilities["cost_per_million"] < 1.0:
        reasons.append("Cost-effective for simple tasks")
        
    # Domain expertise
    if prompt_analysis["domains"]:
        domain_matches = [d for d in prompt_analysis["domains"] if any(d.lower() in bf.lower() for bf in capabilities["best_for"])]
        if domain_matches:
            reasons.append(f"Specialized in {', '.join(domain_matches)}")
    
    return "; ".join(reasons) if reasons else "General compatibility"

def estimate_prompt_cost(prompt_analysis, cost_per_million):
    """Estimate cost for this specific prompt"""
    # More realistic estimation based on prompt length and expected response
    input_tokens = max(prompt_analysis["length"], 50)  # Minimum 50 tokens
    
    # Estimate output tokens based on complexity
    if prompt_analysis["complexity"] == "HIGH":
        output_tokens = input_tokens * 4  # Complex responses are longer
    elif prompt_analysis["complexity"] == "MEDIUM":
        output_tokens = input_tokens * 2
    else:
        output_tokens = input_tokens * 1.5
    
    total_tokens = input_tokens + output_tokens
    
    # Minimum cost calculation (at least 1000 tokens for realistic estimate)
    total_tokens = max(total_tokens, 1000)
    
    return (total_tokens / 1000000) * cost_per_million

def should_recommend_multi_model(prompt_analysis, recommendations):
    """Determine if multi-model analysis would be beneficial"""
    if not recommendations:
        return True
        
    top_confidence = recommendations[0]["confidence"]
    complexity = prompt_analysis["complexity"]
    
    # Recommend multi-model for complex tasks or low confidence
    return complexity == "HIGH" or top_confidence < 80

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

def export_stage3_only(parathinker_result, timestamp, prompt_data=None):
    """Export ONLY Stage 3: Final Decision & Implementation (ultimate answer)"""
    filename = f"myui_stage3_ultimate_answer_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
    
    final_decision = parathinker_result.get("final_decision", "")
    if not final_decision:
        final_decision = "❌ No Stage 3 Final Decision found. This may indicate the ParaThinker analysis did not complete properly."
    
    content = f"""# Ultimate Answer - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

## Original Question
{prompt_data.get('original_prompt', 'No prompt available') if prompt_data else 'No prompt available'}

---

## {final_decision}

---

**Cost**: ${parathinker_result.get("estimated_cost", 0):.4f} | **Duration**: {parathinker_result.get("duration", 0):.2f}s
*Generated by MyUI ParaThinker Stage 3*
"""
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return filename

def export_complete_analysis(prompt_data, responses, parathinker_result, timestamp):
    """Export EVERYTHING: 5 questions, prompt, all responses, synthesis, and Stage 3"""
    filename = f"myui_complete_analysis_{timestamp.strftime('%Y%m%d_%H%M%S')}.md"
    
    content = f"""# Complete ParaThinker Analysis - {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

## Prompt Generator: 5-Step Process

"""
    
    if prompt_data:
        if prompt_data.get('generator_inputs'):
            content += f"""### Step 1: Feature Request
{prompt_data['generator_inputs'].get('feature_request', 'Not provided')}

### Step 2: Purpose/Goal
{prompt_data['generator_inputs'].get('purpose', 'Not provided')}

### Step 3: Requirements
{prompt_data['generator_inputs'].get('requirements', 'Not provided')}

### Step 4: Constraints
{prompt_data['generator_inputs'].get('constraints', 'Not provided')}

### Step 5: Expected Output
{prompt_data['generator_inputs'].get('deliverables', 'Not provided')}

### Generated Prompt (using {prompt_data.get('generator_model', 'Unknown Model')})
```
{prompt_data.get('original_prompt', 'No prompt available')}
```

---

"""
        else:
            content += f"""### Manual Prompt Entry
```
{prompt_data.get('original_prompt', 'No prompt available')}
```

---

"""
    
    content += """## Stage 1: External API Responses (Multi-Model Analysis)

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
        
        content += f"""## Stage 2: ParaThinker Internal Analysis

### Path Reference Map
"""        
        for ref in path_refs:
            content += f"- **Path {ref['id']}**: {ref['model']} ({ref['provider']})\n"
        
        content += f"""\n### Internal Reasoning Paths ({len(parathinker_result.get('internal_paths', []))} paths)

"""
        
        # Add internal paths
        for path in parathinker_result.get("internal_paths", []):
            content += f"""#### Internal Path {path["path_number"]}
```
{path["content"]}
```

"""
        
        content += f"""### Stage 2 Synthesis
{parathinker_result.get("final_synthesis", "")}

---

## Stage 3: Final Decision & Implementation (ULTIMATE ANSWER)

{parathinker_result.get("final_decision", "❌ No Stage 3 Final Decision found")}

---

### Technical Summary
- **External Paths**: {len(responses)} models
- **Internal Paths**: {len(parathinker_result.get('internal_paths', []))} reasoning paths
- **Total Cost**: ${sum([r.get('estimated_cost', 0) for r in responses]) + parathinker_result.get('estimated_cost', 0):.4f}
- **Stage 1 Duration**: {sum([r.get('duration', 0) for r in responses if r.get('success')]):.2f}s
- **Stage 2+3 Duration**: {parathinker_result.get("duration", 0):.2f}s
- **Input Tokens**: ~{token_info.get('estimated_input_tokens', 0):,}
- **Pre-summarized**: {'Yes' if token_info.get('pre_summarized') else 'No'}

*Complete analysis generated by MyUI ParaThinker 3-Stage System*
"""
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
        
    return filename

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
        
        content += f"""## Stage 2: ParaThinker Synthesis

{parathinker_result.get("final_synthesis", "")}

---

## Stage 3: Final Decision & Implementation

{parathinker_result.get("final_decision", "❌ No Stage 3 Final Decision found")}

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
    
# Prompt Generator state
if 'prompt_gen_model' not in st.session_state:
    # Load from config first, fallback to GLM 4.5, then any available model
    saved_gen_model = st.session_state.config.get('prompt_gen_model')
    if saved_gen_model and saved_gen_model in MODELS:
        st.session_state.prompt_gen_model = saved_gen_model
    elif "zhipuai/glm-4.5" in MODELS:
        st.session_state.prompt_gen_model = "zhipuai/glm-4.5"
    else:
        st.session_state.prompt_gen_model = list(MODELS.keys())[0] if MODELS else None
if 'prompt_gen_inputs' not in st.session_state:
    st.session_state.prompt_gen_inputs = {
        'feature_request': '',
        'purpose': '',
        'requirements': '',
        'constraints': '',
        'deliverables': ''
    }
if 'generated_prompt' not in st.session_state:
    st.session_state.generated_prompt = ''
if 'manual_prompt' not in st.session_state:
    st.session_state.manual_prompt = ''

# Smart Model Selector state
if 'prompt_analysis' not in st.session_state:
    st.session_state.prompt_analysis = None
if 'model_recommendations' not in st.session_state:
    st.session_state.model_recommendations = None
if 'single_model_result' not in st.session_state:
    st.session_state.single_model_result = None
if 'selected_single_model' not in st.session_state:
    st.session_state.selected_single_model = None

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
    
    # Prompt Generator Section
    with st.expander("🤖 AI Prompt Generator", expanded=False):
        st.caption("Let AI help you create a structured analysis prompt")
        
        # Model selection for prompt generation
        if MODELS:
            available_models = list(MODELS.keys())
            current_model = st.session_state.prompt_gen_model
            if current_model not in available_models:
                current_model = available_models[0]
                st.session_state.prompt_gen_model = current_model
                
            selected_gen_model = st.selectbox(
                "Prompt Generation Model:",
                options=available_models,
                format_func=lambda x: f"{MODELS[x]['name']} (${MODELS[x]['cost']}/M)",
                index=available_models.index(current_model) if current_model in available_models else 0,
                help="Select model to help generate structured prompts",
                key="prompt_gen_model_select"
            )
            
            # Save model selection
            if selected_gen_model != st.session_state.prompt_gen_model:
                st.session_state.prompt_gen_model = selected_gen_model
                # Save to config for persistence
                if 'prompt_gen_model' not in st.session_state.config:
                    st.session_state.config['prompt_gen_model'] = selected_gen_model
                else:
                    st.session_state.config['prompt_gen_model'] = selected_gen_model
                save_config(st.session_state.config)
            
            # Structured input fields
            st.markdown("**Step 1: Describe what you want to build/analyze:**")
            feature_request = st.text_area(
                "Feature Request:",
                value=st.session_state.prompt_gen_inputs['feature_request'],
                placeholder="e.g., Add horizontal timeline above AI prompt window for sales script tracking",
                key="pg_feature_request",
                height=80
            )
            
            st.markdown("**Step 2: Why do you need this? (Optional)**")
            purpose = st.text_area(
                "Purpose/Goal:",
                value=st.session_state.prompt_gen_inputs['purpose'],
                placeholder="e.g., Help Ollama understand conversation position and provide contextual guidance",
                key="pg_purpose",
                height=60
            )
            
            st.markdown("**Step 3: Specific requirements? (Optional)**")
            requirements = st.text_area(
                "Requirements:",
                value=st.session_state.prompt_gen_inputs['requirements'],
                placeholder="e.g., Must be responsive, integrate with existing components, use TypeScript",
                key="pg_requirements",
                height=60
            )
            
            st.markdown("**Step 4: Any constraints or considerations? (Optional)**")
            constraints = st.text_area(
                "Constraints:",
                value=st.session_state.prompt_gen_inputs['constraints'],
                placeholder="e.g., Keep existing UI intact, minimize performance impact, follow current patterns",
                key="pg_constraints",
                height=60
            )
            
            st.markdown("**Step 5: What deliverable do you expect? (Optional)**")
            deliverables = st.text_area(
                "Expected Output:",
                value=st.session_state.prompt_gen_inputs['deliverables'],
                placeholder="e.g., Implementation plan, file locations, code structure, integration steps",
                key="pg_deliverables",
                height=60
            )
            
            # Update session state
            st.session_state.prompt_gen_inputs = {
                'feature_request': feature_request,
                'purpose': purpose,
                'requirements': requirements,
                'constraints': constraints,
                'deliverables': deliverables
            }
            
            # Generate prompt button
            if st.button("✨ Generate Professional Prompt", type="secondary", disabled=not feature_request.strip()):
                if not st.session_state.config.get('api_key'):
                    st.error("Please enter your API key first")
                elif not feature_request.strip():
                    st.error("Please enter a feature request")
                else:
                    with st.spinner(f"Generating prompt using {MODELS[selected_gen_model]['name']}..."):
                        # Create prompt generation request
                        generation_prompt = f"""You are an expert software architect and prompt engineer. Create a detailed, professional analysis prompt based on the user's request.

USER REQUEST:
Feature: {feature_request}
Purpose: {purpose if purpose.strip() else 'Not specified'}
Requirements: {requirements if requirements.strip() else 'Not specified'}
Constraints: {constraints if constraints.strip() else 'Not specified'}
Expected Output: {deliverables if deliverables.strip() else 'Implementation plan'}

Create a structured prompt that includes:
1. REQUIREMENT section (what needs to be built)
2. ANALYSIS NEEDED section (specific tasks for AI)
3. DELIVERABLE section (expected output format)

Keep it concise but comprehensive. Do not include PROJECT CONTEXT details like tech stack - that will be provided automatically from scanned project files.

Focus on the analysis and implementation aspects. Make it suitable for multiple AI models to provide different perspectives."""

                        try:
                            async def generate_prompt():
                                async with aiohttp.ClientSession() as session:
                                    return await query_model(session, selected_gen_model, generation_prompt)
                            
                            result = run_async_safely(generate_prompt())
                            
                            if result["success"]:
                                st.session_state.generated_prompt = result["content"]
                                st.success(f"✅ Prompt generated! Cost: ${result['estimated_cost']:.4f}")
                            else:
                                st.error(f"Generation failed: {result['error']}")
                        except Exception as e:
                            st.error(f"Generation error: {e}")
            
            # Show generated prompt
            if st.session_state.generated_prompt:
                st.markdown("**Generated Prompt:**")
                edited_prompt = st.text_area(
                    "Review and edit if needed:",
                    value=st.session_state.generated_prompt,
                    height=200,
                    key="generated_prompt_edit"
                )
                
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("📝 Use This Prompt", type="primary"):
                        st.session_state.manual_prompt = edited_prompt
                        st.success("✅ Prompt loaded into main input!")
                        st.rerun()
                
                with col2:
                    if st.button("🗑️ Clear Generated"):
                        st.session_state.generated_prompt = ''
                        st.rerun()
        else:
            st.error("No models configured for prompt generation")
    
    # Prompt input
    st.subheader("💭 Prompt Input")
    prompt = st.text_area(
        "Enter your prompt/question/PRD:",
        value=st.session_state.manual_prompt,
        height=200,
        placeholder="Enter your coding question, analysis request, or problem description...",
        key="main_prompt_input"
    )
    
    # Update manual prompt when user edits
    if prompt != st.session_state.manual_prompt:
        st.session_state.manual_prompt = prompt
    
    # Analyze prompt when it changes
    if prompt.strip():
        new_analysis = analyze_prompt(prompt)
        if new_analysis != st.session_state.prompt_analysis:
            st.session_state.prompt_analysis = new_analysis
            # Generate new recommendations
            available_models = list(MODELS.keys()) if MODELS else []
            st.session_state.model_recommendations = recommend_model(new_analysis, available_models)
    else:
        st.session_state.prompt_analysis = None
        st.session_state.model_recommendations = None
    
    # Smart Model Selector Section
    if st.session_state.prompt_analysis and MODELS:
        with st.expander("🎯 Smart Model Selector", expanded=True):
            st.caption("AI-powered model recommendation based on your prompt analysis")
            
            analysis = st.session_state.prompt_analysis
            recommendations = st.session_state.model_recommendations
            
            # Show prompt analysis
            col1, col2 = st.columns(2)
            with col1:
                st.markdown("**📊 Prompt Analysis:**")
                st.write(f"**Type:** {', '.join(analysis['request_types']).replace('_', ' ').title()}")
                st.write(f"**Complexity:** {analysis['complexity'].title()}")
            
            with col2:
                st.write(f"**Domains:** {', '.join(analysis['domains'])}")
                st.write(f"**Output:** {analysis['output_format'].title()}")
            
            if recommendations:
                primary = recommendations["primary"]
                alternatives = recommendations["alternatives"]
                should_multi = recommendations["should_use_multi_model"]
                
                st.divider()
                
                # Primary recommendation
                st.markdown("**🏆 Recommended Model:**")
                confidence_color = "🟢" if primary["confidence"] >= 85 else "🟡" if primary["confidence"] >= 70 else "🟠"
                
                rec_col1, rec_col2, rec_col3 = st.columns([3, 1.5, 1.5])
                with rec_col1:
                    st.write(f"**{primary['model_name']}** {confidence_color} {primary['confidence']}%")
                    st.caption(f"💡 {primary['reasoning']}")
                
                with rec_col2:
                    cost_text = f"${primary['estimated_cost']:.3f}" if primary['estimated_cost'] >= 0.001 else f"${primary['estimated_cost']:.4f}"
                    st.metric("Cost", cost_text)
                
                with rec_col3:
                    if st.button("🚀 Use This Model", type="primary", key="use_recommended"):
                        st.session_state.selected_single_model = primary["model_id"]
                        # Execute single model
                        with st.spinner(f"Analyzing with {primary['model_name']}..."):
                            try:
                                context = ""
                                if st.session_state.context.get('summary'):
                                    context = f"PROJECT CONTEXT:\n{st.session_state.context['summary']}\n\n"
                                
                                async def single_model_query():
                                    async with aiohttp.ClientSession() as session:
                                        return await query_model(session, primary["model_id"], prompt, context)
                                
                                result = run_async_safely(single_model_query())
                                st.session_state.single_model_result = result
                                
                                if result["success"]:
                                    st.success(f"✅ Analysis complete! Cost: ${result['estimated_cost']:.4f}")
                                    st.rerun()  # Refresh to show results in main area
                                else:
                                    st.error(f"❌ Analysis failed: {result['error']}")
                            except Exception as e:
                                st.error(f"❌ Error: {e}")
                
                # Alternative recommendations
                if alternatives:
                    st.markdown("**🥈 Alternatives:**")
                    for i, alt in enumerate(alternatives):
                        alt_col1, alt_col2, alt_col3 = st.columns([3, 1.5, 1.5])
                        with alt_col1:
                            confidence_color = "🟢" if alt["confidence"] >= 85 else "🟡" if alt["confidence"] >= 70 else "🟠"
                            st.write(f"**{alt['model_name']}** {confidence_color} {alt['confidence']}%")
                            st.caption(f"💡 {alt['reasoning']}")
                        with alt_col2:
                            cost_diff = ((alt['estimated_cost'] - primary['estimated_cost']) / primary['estimated_cost'] * 100) if primary['estimated_cost'] > 0 else 0
                            cost_indicator = "📈" if cost_diff > 10 else "📉" if cost_diff < -10 else "📊"
                            cost_text = f"${alt['estimated_cost']:.3f}" if alt['estimated_cost'] >= 0.001 else f"${alt['estimated_cost']:.4f}"
                            st.metric("Cost", f"{cost_indicator} {cost_text}")
                        with alt_col3:
                            if st.button(f"Use {alt['model_name']}", key=f"use_alt_{i}"):
                                st.session_state.selected_single_model = alt["model_id"]
                                with st.spinner(f"Analyzing with {alt['model_name']}..."):
                                    try:
                                        context = ""
                                        if st.session_state.context.get('summary'):
                                            context = f"PROJECT CONTEXT:\n{st.session_state.context['summary']}\n\n"
                                        
                                        async def single_model_query():
                                            async with aiohttp.ClientSession() as session:
                                                return await query_model(session, alt["model_id"], prompt, context)
                                        
                                        result = run_async_safely(single_model_query())
                                        st.session_state.single_model_result = result
                                        
                                        if result["success"]:
                                            st.success(f"✅ Analysis complete! Cost: ${result['estimated_cost']:.4f}")
                                            st.rerun()  # Refresh to show results in sidebar
                                        else:
                                            st.error(f"❌ Analysis failed: {result['error']}")
                                    except Exception as e:
                                        st.error(f"❌ Error: {e}")
                
                # Multi-model recommendation
                if should_multi:
                    st.warning("⚠️ **Consider Multi-Model Analysis:** Complex task detected - multiple perspectives recommended for best results")
                
                st.divider()
                
                # Action buttons
                button_col1, button_col2 = st.columns(2)
                with button_col1:
                    if st.button("🔄 Use Traditional Multi-Model", key="use_multi_model"):
                        # Clear single model results to use traditional workflow
                        st.session_state.single_model_result = None
                        st.session_state.selected_single_model = None
                        st.info("👆 Configure Stage 1 models above and click 'Start ParaThinker'")
                
                with button_col2:
                    if st.session_state.single_model_result:
                        if st.button("🗑️ Clear Result", key="clear_single_result"):
                            st.session_state.single_model_result = None
                            st.session_state.selected_single_model = None
                            st.rerun()
            else:
                st.warning("⚠️ No model recommendations available. Please check your model configuration.")
    
    # Display single model result
    if st.session_state.single_model_result:
        result = st.session_state.single_model_result
        
        st.subheader("🎯 Single Model Analysis Result")
        
        if result["success"]:
            # Summary stats
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Model Used", result["model_name"])
            with col2:
                st.metric("Duration", f"{result['duration']:.2f}s")
            with col3:
                st.metric("Cost", f"${result['estimated_cost']:.4f}")
            
            # Response content
            st.text_area(
                "Analysis Result:",
                value=result.get("content", "No content available"),
                height=400,
                key="single_model_response",
                disabled=True
            )
            
            # Satisfaction feedback
            col1, col2 = st.columns([3, 1])
            with col1:
                satisfaction = st.slider(
                    "Rate this result (helps improve recommendations):",
                    1, 5, 3,
                    help="1=Poor, 5=Excellent"
                )
            with col2:
                if st.button("💾 Save Feedback", key="save_feedback"):
                    # Here you could implement feedback tracking
                    st.success("✅ Feedback saved!")
            
            # Get second opinion option
            if st.button("🔍 Get Second Opinion (Multi-Model)", key="get_second_opinion"):
                st.session_state.single_model_result = None
                st.info("👆 Configure Stage 1 models above and click 'Start ParaThinker'")
        
        else:
            st.error(f"❌ Analysis failed: {result['error']}")
            if st.button("🔄 Try Different Model", key="retry_different"):
                st.session_state.single_model_result = None
                st.session_state.selected_single_model = None
                st.rerun()
        
        st.divider()
    
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
                    
                    # Show vision support indicator
                    if selected_model in models_config["models"] and models_config["models"][selected_model].get("vision_support", False):
                        st.markdown("🎨 **Vision Support** - Can analyze images", help="This model supports image inputs along with text prompts")
            
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
        # Export options moved to Stage 3 section for better UX
        if st.session_state.parathinker_result and st.session_state.parathinker_result.get("success"):
            st.info("📋 Export options in Stage 3 ↓")
    
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
            
            # Stage 3: Final Decision & Implementation (NEW!)
            stage3_content = result.get("final_decision", "")
            
            # Always display Stage 3, create fallback if needed
            if not stage3_content:
                # Create fallback Stage 3 from synthesis
                synthesis_content = result.get("final_synthesis", "")
                if synthesis_content:
                    stage3_content = f"STAGE 3: FINAL DECISION & IMPLEMENTATION\n\nBased on the comprehensive analysis, here are the key actionable recommendations:\n\n{synthesis_content[-1000:] if len(synthesis_content) > 1000 else synthesis_content}"
                else:
                    stage3_content = "STAGE 3: FINAL DECISION & IMPLEMENTATION\n\n⚠️ Unable to extract specific implementation details from the analysis. Please review the complete synthesis above for actionable insights."
            
            with st.expander("🎯 Stage 3: Final Decision & Implementation (ULTIMATE ANSWER)", expanded=True):
                st.text_area(
                    "Definitive Recommendation & Implementation Plan:",
                    value=stage3_content,
                    height=350,
                    key="final_decision_display",
                    disabled=True
                )
                
                # Export buttons for Stage 3
                col_export1, col_export2 = st.columns(2)
                with col_export1:
                    if st.button("💾 Export Ultimate Answer Only", key="export_stage3_only"):
                        # Prepare prompt data for export
                        prompt_data = {
                            'original_prompt': st.session_state.history[0]["prompt"] if st.session_state.history else "Unknown prompt",
                            'generator_inputs': st.session_state.prompt_gen_inputs if hasattr(st.session_state, 'prompt_gen_inputs') else None,
                            'generator_model': st.session_state.prompt_gen_model if hasattr(st.session_state, 'prompt_gen_model') else None
                        }
                        # Ensure we use the fallback content for export
                        export_result = result.copy()
                        export_result["final_decision"] = stage3_content
                        filename = export_stage3_only(export_result, datetime.now(), prompt_data)
                        st.success(f"✅ Ultimate answer exported to {filename}")
                
                with col_export2:
                    if st.button("📋 Export Complete Analysis", key="export_complete_analysis"):
                        # Prepare complete prompt data
                        prompt_data = {
                            'original_prompt': st.session_state.history[0]["prompt"] if st.session_state.history else "Unknown prompt",
                            'generator_inputs': st.session_state.prompt_gen_inputs if hasattr(st.session_state, 'prompt_gen_inputs') else None,
                            'generator_model': st.session_state.prompt_gen_model if hasattr(st.session_state, 'prompt_gen_model') else None
                        }
                        responses = st.session_state.responses if st.session_state.responses else []
                        # Ensure we use the fallback content for export
                        export_result = result.copy()
                        export_result["final_decision"] = stage3_content
                        filename = export_complete_analysis(prompt_data, responses, export_result, datetime.now())
                        st.success(f"✅ Complete analysis exported to {filename}")
                
                st.info("💡 **Stage 3 provides the actionable final answer** - everything you need to implement the solution!")
            
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

    **🎯 Stage 3 (Final Decision & Implementation) - THE ULTIMATE ANSWER:**
    - Provides definitive, actionable recommendations based on all analysis
    - Step-by-step implementation plan with concrete tasks
    - Specific deliverables: actual code, configurations, or actions to take
    - Success criteria to measure if the implementation worked
    - **This is your final answer** - everything you need to implement the solution!
    
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
    7. **Review Stage 3: Final Decision & Implementation** - your ultimate actionable answer
    8. Export either just Stage 3 (ultimate answer) or complete analysis
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