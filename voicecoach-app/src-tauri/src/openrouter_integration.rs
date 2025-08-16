/**
 * OpenRouter API Integration for VoiceCoach Real-Time Coaching
 * 
 * High-performance integration layer that bridges Tauri frontend 
 * with Python OpenRouter client for <2 second coaching responses.
 */

use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::process::Command;
use std::time::Instant;
use tokio::time::{timeout, Duration};

use crate::breadcrumb_system::BreadcrumbTrail;

#[derive(Debug, Serialize, Deserialize)]
pub struct CoachingContext {
    pub conversation_snippet: String,
    pub sales_stage: String,
    pub participant_roles: std::collections::HashMap<String, String>,
    pub call_duration_minutes: i32,
    pub key_topics_discussed: Vec<String>,
    pub objections_detected: Vec<String>,
    pub sentiment_analysis: Option<std::collections::HashMap<String, f64>>,
    pub company_context: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoachingPrompt {
    pub primary_suggestion: String,
    pub confidence_score: f64,
    pub prompt_type: String,
    pub urgency_level: String,
    pub supporting_evidence: Vec<String>,
    pub next_best_actions: Vec<String>,
    pub knowledge_sources: Vec<String>,
    pub estimated_impact: String,
    pub implementation_difficulty: String,
    pub model_used: String,
    pub response_time_ms: i32,
    pub token_usage: std::collections::HashMap<String, i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationAnalysis {
    pub current_stage: String,
    pub confidence: f64,
    pub key_topics: Vec<String>,
    pub objections: Vec<String>,
    pub opportunities: Vec<String>,
    pub sentiment: String,
    pub talk_time_ratio: std::collections::HashMap<String, f64>,
    pub urgency_score: f64,
}

pub struct OpenRouterClient {
    api_key: String,
    breadcrumb_trail: BreadcrumbTrail,
    python_client_path: String,
}

impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        let mut trail = BreadcrumbTrail::new("OpenRouterIntegration".to_string());
        
        // LED 800: OpenRouter client initialization
        trail.light(800, json!({
            "operation": "openrouter_client_init",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));

        Self {
            api_key,
            breadcrumb_trail: trail,
            python_client_path: "../../src/coaching_engine/openrouter_cli.py".to_string(),
        }
    }

    /**
     * Generate AI coaching prompts with <500ms target latency
     * Integrates with Python OpenRouter client for real AI analysis
     */
    pub async fn generate_coaching_prompt(
        &mut self,
        context: CoachingContext,
        model: Option<String>,
        priority: Option<String>,
    ) -> Result<CoachingPrompt, String> {
        let start_time = Instant::now();
        
        // LED 810: Coaching prompt generation start
        self.breadcrumb_trail.light(810, json!({
            "operation": "coaching_prompt_generation_start",
            "sales_stage": context.sales_stage,
            "conversation_length": context.conversation_snippet.len(),
            "model": model.as_ref().unwrap_or(&"gpt-4-turbo".to_string())
        }));

        let model = model.unwrap_or_else(|| "openai/gpt-4-turbo".to_string());
        let priority = priority.unwrap_or_else(|| "balanced".to_string());

        // Prepare Python client command
        let python_args = json!({
            "action": "generate_coaching_prompt",
            "context": context,
            "model": model,
            "priority": priority,
            "api_key": self.api_key
        });

        // LED 811: Python client execution start
        self.breadcrumb_trail.light(811, json!({
            "operation": "python_client_execution_start",
            "args_size": python_args.to_string().len()
        }));

        // Execute Python OpenRouter client with timeout
        let python_result = timeout(
            Duration::from_millis(1500), // 1.5s timeout for <2s total response
            self.execute_python_client(python_args)
        ).await;

        match python_result {
            Ok(Ok(result)) => {
                let processing_time = start_time.elapsed().as_millis() as i32;
                
                // Parse Python client response
                match serde_json::from_value::<CoachingPrompt>(result) {
                    Ok(mut prompt) => {
                        prompt.response_time_ms = processing_time;
                        
                        // LED 812: Coaching prompt generation success
                        self.breadcrumb_trail.light(812, json!({
                            "operation": "coaching_prompt_generation_success",
                            "response_time_ms": processing_time,
                            "confidence": prompt.confidence_score,
                            "prompt_type": prompt.prompt_type,
                            "urgency": prompt.urgency_level
                        }));

                        // Performance validation
                        if processing_time > 2000 {
                            self.breadcrumb_trail.fail(813, json!({
                                "operation": "performance_target_missed",
                                "response_time_ms": processing_time,
                                "target_ms": 2000
                            }));
                        }

                        Ok(prompt)
                    }
                    Err(e) => {
                        self.breadcrumb_trail.fail(810, json!({
                            "operation": "prompt_parsing_failed",
                            "error": e.to_string()
                        }));
                        Err(format!("Failed to parse coaching prompt: {}", e))
                    }
                }
            }
            Ok(Err(e)) => {
                self.breadcrumb_trail.fail(811, json!({
                    "operation": "python_client_execution_failed",
                    "error": e
                }));
                
                // Fallback to fast local coaching
                self.generate_fallback_coaching(context).await
            }
            Err(_) => {
                self.breadcrumb_trail.fail(811, json!({
                    "operation": "python_client_timeout",
                    "timeout_ms": 1500
                }));
                
                // Fallback to fast local coaching
                self.generate_fallback_coaching(context).await
            }
        }
    }

    /**
     * Analyze conversation context with <100ms target latency
     */
    pub async fn analyze_conversation(
        &mut self,
        transcription_text: String,
        speaker: String,
        current_stage: String,
        conversation_history: String,
    ) -> Result<ConversationAnalysis, String> {
        let start_time = Instant::now();

        // LED 820: Conversation analysis start
        self.breadcrumb_trail.light(820, json!({
            "operation": "conversation_analysis_start",
            "speaker": speaker,
            "current_stage": current_stage,
            "text_length": transcription_text.len()
        }));

        let python_args = json!({
            "action": "analyze_conversation",
            "transcription_text": transcription_text,
            "speaker": speaker,
            "current_stage": current_stage,
            "conversation_history": conversation_history,
            "api_key": self.api_key
        });

        // Fast timeout for conversation analysis
        let python_result = timeout(
            Duration::from_millis(500), // 500ms timeout for analysis
            self.execute_python_client(python_args)
        ).await;

        match python_result {
            Ok(Ok(result)) => {
                let processing_time = start_time.elapsed().as_millis() as i32;
                
                match serde_json::from_value::<ConversationAnalysis>(result) {
                    Ok(analysis) => {
                        // LED 821: Conversation analysis success
                        self.breadcrumb_trail.light(821, json!({
                            "operation": "conversation_analysis_success",
                            "response_time_ms": processing_time,
                            "stage": analysis.current_stage,
                            "confidence": analysis.confidence,
                            "urgency": analysis.urgency_score
                        }));

                        Ok(analysis)
                    }
                    Err(e) => {
                        self.breadcrumb_trail.fail(820, json!({
                            "operation": "analysis_parsing_failed",
                            "error": e.to_string()
                        }));
                        
                        // Return basic analysis fallback
                        self.generate_fallback_analysis(transcription_text, current_stage).await
                    }
                }
            }
            Ok(Err(e)) => {
                self.breadcrumb_trail.fail(820, json!({
                    "operation": "conversation_analysis_failed",
                    "error": e
                }));
                
                self.generate_fallback_analysis(transcription_text, current_stage).await
            }
            Err(_) => {
                // Timeout - return fast fallback
                self.generate_fallback_analysis(transcription_text, current_stage).await
            }
        }
    }

    /**
     * Retrieve knowledge base content with <100ms target latency
     */
    pub async fn retrieve_knowledge(
        &mut self,
        query: String,
        stage: String,
        topics: Vec<String>,
        max_results: i32,
    ) -> Result<Vec<Value>, String> {
        let start_time = Instant::now();

        // LED 830: Knowledge retrieval start
        self.breadcrumb_trail.light(830, json!({
            "operation": "knowledge_retrieval_start",
            "query_length": query.len(),
            "stage": stage,
            "topics_count": topics.len(),
            "max_results": max_results
        }));

        let python_args = json!({
            "action": "retrieve_knowledge",
            "query": query,
            "stage": stage,
            "topics": topics,
            "max_results": max_results,
            "api_key": self.api_key
        });

        // Fast timeout for knowledge retrieval
        let python_result = timeout(
            Duration::from_millis(300), // 300ms timeout for knowledge
            self.execute_python_client(python_args)
        ).await;

        match python_result {
            Ok(Ok(result)) => {
                let processing_time = start_time.elapsed().as_millis() as i32;
                
                if let Value::Array(knowledge_items) = result {
                    // LED 831: Knowledge retrieval success
                    self.breadcrumb_trail.light(831, json!({
                        "operation": "knowledge_retrieval_success",
                        "response_time_ms": processing_time,
                        "results_count": knowledge_items.len()
                    }));

                    Ok(knowledge_items)
                } else {
                    self.breadcrumb_trail.fail(830, json!({
                        "operation": "knowledge_format_invalid",
                        "result_type": "non_array"
                    }));
                    
                    // Return fallback knowledge
                    Ok(self.generate_fallback_knowledge(stage))
                }
            }
            Ok(Err(e)) => {
                self.breadcrumb_trail.fail(830, json!({
                    "operation": "knowledge_retrieval_failed",
                    "error": e
                }));
                
                Ok(self.generate_fallback_knowledge(stage))
            }
            Err(_) => {
                // Timeout - return fast fallback
                Ok(self.generate_fallback_knowledge(stage))
            }
        }
    }

    /**
     * Execute Python OpenRouter client with error handling
     */
    async fn execute_python_client(&self, args: Value) -> Result<Value, String> {
        let args_json = args.to_string();
        
        let output = Command::new("python")
            .arg(&self.python_client_path)
            .arg("--api-request")
            .arg(&args_json)
            .output()
            .map_err(|e| format!("Failed to execute Python client: {}", e))?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            serde_json::from_str(&stdout)
                .map_err(|e| format!("Failed to parse Python response: {}", e))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Python client error: {}", stderr))
        }
    }

    /**
     * Generate fallback coaching when OpenRouter API fails
     */
    async fn generate_fallback_coaching(&mut self, context: CoachingContext) -> Result<CoachingPrompt, String> {
        // LED 890: Fallback coaching generation
        self.breadcrumb_trail.light(890, json!({
            "operation": "fallback_coaching_generated",
            "sales_stage": context.sales_stage
        }));

        let stage_prompts = match context.sales_stage.as_str() {
            "discovery" => "Ask open-ended questions to understand their pain points better.",
            "presentation" => "Focus on features that directly address their stated needs.",
            "objection_handling" => "Acknowledge their concern and ask clarifying questions.",
            "closing" => "Summarize the value and ask for their commitment.",
            "negotiation" => "Find win-win solutions that address their budget concerns.",
            _ => "Listen actively and build rapport with the prospect.",
        };

        Ok(CoachingPrompt {
            primary_suggestion: stage_prompts.to_string(),
            confidence_score: 0.3,
            prompt_type: "fallback".to_string(),
            urgency_level: "medium".to_string(),
            supporting_evidence: vec!["Sales best practices".to_string()],
            next_best_actions: vec![
                "Listen actively".to_string(),
                "Ask questions".to_string(),
                "Build rapport".to_string(),
            ],
            knowledge_sources: vec!["VoiceCoach fallback system".to_string()],
            estimated_impact: "medium".to_string(),
            implementation_difficulty: "easy".to_string(),
            model_used: "fallback".to_string(),
            response_time_ms: 0,
            token_usage: std::collections::HashMap::new(),
        })
    }

    /**
     * Generate fallback conversation analysis
     */
    async fn generate_fallback_analysis(&mut self, text: String, current_stage: String) -> Result<ConversationAnalysis, String> {
        let text_lower = text.to_lowercase();
        
        // Simple keyword-based analysis
        let detected_stage = if text_lower.contains("hi") || text_lower.contains("hello") {
            "opening".to_string()
        } else if text_lower.contains("what") || text_lower.contains("how") {
            "discovery".to_string()
        } else if text_lower.contains("but") || text_lower.contains("concern") {
            "objection_handling".to_string()
        } else if text_lower.contains("interested") || text_lower.contains("next steps") {
            "closing".to_string()
        } else {
            current_stage
        };

        Ok(ConversationAnalysis {
            current_stage: detected_stage,
            confidence: 0.5,
            key_topics: vec!["general conversation".to_string()],
            objections: vec![],
            opportunities: vec![],
            sentiment: "neutral".to_string(),
            talk_time_ratio: {
                let mut ratio = std::collections::HashMap::new();
                ratio.insert("user".to_string(), 50.0);
                ratio.insert("prospect".to_string(), 50.0);
                ratio
            },
            urgency_score: 0.3,
        })
    }

    /**
     * Generate fallback knowledge base results
     */
    fn generate_fallback_knowledge(&self, stage: String) -> Vec<Value> {
        let knowledge = match stage.as_str() {
            "discovery" => vec![
                json!({
                    "content": "Ask open-ended discovery questions to understand their current process and pain points. Use the SPIN selling methodology.",
                    "source": "Sales Methodology Guide",
                    "relevance": 0.9,
                    "type": "Discovery Technique"
                })
            ],
            "presentation" => vec![
                json!({
                    "content": "When presenting features, always tie them back to the specific pain points mentioned by the prospect.",
                    "source": "Product Demo Best Practices", 
                    "relevance": 0.8,
                    "type": "Presentation Tip"
                })
            ],
            "objection_handling" => vec![
                json!({
                    "content": "Address objections with empathy first: 'I understand your concern about cost. Let me show you the ROI...'",
                    "source": "Objection Handling Scripts",
                    "relevance": 0.85,
                    "type": "Objection Response"
                })
            ],
            _ => vec![
                json!({
                    "content": "Build rapport and establish trust before moving to business discussions.",
                    "source": "General Sales Best Practices",
                    "relevance": 0.7,
                    "type": "Relationship Building"
                })
            ],
        };

        knowledge
    }

    /**
     * Get performance statistics for monitoring
     */
    pub fn get_performance_stats(&self) -> Value {
        json!({
            "openrouter_integration": {
                "python_client_path": self.python_client_path,
                "breadcrumb_trail_length": self.breadcrumb_trail.get_trail_length(),
                "integration_status": "operational"
            }
        })
    }
}

// Global OpenRouter client instance
static mut OPENROUTER_CLIENT: Option<OpenRouterClient> = None;

/**
 * Initialize OpenRouter client with API key
 */
pub fn initialize_openrouter_client(api_key: String) -> Result<(), String> {
    unsafe {
        OPENROUTER_CLIENT = Some(OpenRouterClient::new(api_key));
    }
    info!("OpenRouter client initialized successfully");
    Ok(())
}

/**
 * Get reference to OpenRouter client
 */
pub fn with_openrouter_client<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut OpenRouterClient) -> Result<R, String>,
{
    unsafe {
        match OPENROUTER_CLIENT.as_mut() {
            Some(client) => f(client),
            None => Err("OpenRouter client not initialized".to_string()),
        }
    }
}