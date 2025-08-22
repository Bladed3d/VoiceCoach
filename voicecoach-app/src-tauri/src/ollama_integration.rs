// Ollama AI Coaching Integration Module
// Provides real-time AI coaching suggestions using local Ollama LLM

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use serde_json::json;
use log::{info, warn, error};
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaOptions {
    temperature: f32,
    top_p: f32,
    num_predict: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaResponse {
    pub response: String,
    pub done: bool,
    pub context: Option<Vec<i32>>,
    pub total_duration: Option<i64>,
    pub prompt_eval_count: Option<i32>,
    pub eval_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoachingSuggestion {
    pub suggestion: String,
    pub confidence: f32,
    pub reasoning: Option<String>,
    pub action_items: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KnowledgeDocument {
    pub filename: String,
    pub content: String,
    pub chunks: Vec<String>,
    pub timestamp: i64,
    pub doc_type: Option<String>,
    pub is_ai_generated: bool,
}

pub struct OllamaCoachingService {
    base_url: String,
    model: String,
    client: reqwest::Client,
}

impl OllamaCoachingService {
    pub fn new() -> Self {
        Self {
            base_url: "http://localhost:11434".to_string(),
            model: "qwen2.5:14b-instruct-q4_k_m".to_string(),
            client: reqwest::Client::new(),
        }
    }

    /// Check if Ollama service is running
    pub async fn check_availability(&self) -> Result<bool> {
        info!("🔍 LED 6001: Checking Ollama service availability");
        
        let url = format!("{}/api/tags", self.base_url);
        let result = self.client
            .get(&url)
            .timeout(std::time::Duration::from_secs(2))
            .send()
            .await;

        match result {
            Ok(response) if response.status().is_success() => {
                info!("✅ LED 6002: Ollama service is available");
                Ok(true)
            }
            _ => {
                warn!("⚠️ LED 6003: Ollama service not available, will use fallback");
                Ok(false)
            }
        }
    }

    /// Generate coaching suggestion based on transcription
    pub async fn generate_coaching(
        &self,
        transcription: &str,
        knowledge_base: Option<Vec<KnowledgeDocument>>,
        context: Option<String>,
    ) -> Result<CoachingSuggestion> {
        info!("🎯 LED 6100: Starting Ollama coaching generation");
        let start_time = Instant::now();

        // Build optimized prompt with knowledge base context
        let prompt = self.build_coaching_prompt(transcription, knowledge_base, context)?;
        
        info!("📊 LED 6101: Prompt built, size: {} chars", prompt.len());

        // Check token limit (4096 tokens ≈ 16384 chars)
        const MAX_CHARS: usize = 15000; // Conservative limit
        let final_prompt = if prompt.len() > MAX_CHARS {
            warn!("⚠️ LED 6102: Prompt too large ({} chars), compressing", prompt.len());
            self.compress_prompt(&prompt, MAX_CHARS)
        } else {
            prompt
        };

        // Create Ollama request
        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: final_prompt,
            stream: false,
            options: OllamaOptions {
                temperature: 0.3,
                top_p: 0.9,
                num_predict: 300,
            },
        };

        info!("🚀 LED 6110: Sending request to Ollama");
        
        // Send request to Ollama
        let url = format!("{}/api/generate", self.base_url);
        let response = self.client
            .post(&url)
            .json(&request)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await
            .context("Failed to send request to Ollama")?;

        if !response.status().is_success() {
            error!("❌ LED 6111: Ollama request failed with status: {}", response.status());
            return Err(anyhow::anyhow!("Ollama request failed: {}", response.status()));
        }

        let ollama_response: OllamaResponse = response.json().await
            .context("Failed to parse Ollama response")?;

        info!("✅ LED 6120: Ollama response received in {:?}", start_time.elapsed());

        // Parse the response into coaching suggestion
        let suggestion = self.parse_coaching_response(&ollama_response.response)?;
        
        info!("🎯 LED 6130: Coaching suggestion generated successfully");
        Ok(suggestion)
    }

    /// Build optimized prompt for coaching
    fn build_coaching_prompt(
        &self,
        transcription: &str,
        knowledge_base: Option<Vec<KnowledgeDocument>>,
        context: Option<String>,
    ) -> Result<String> {
        let mut prompt = String::new();

        // Add role and context
        prompt.push_str("You are an expert sales coach providing real-time guidance.\n\n");

        // Add knowledge base context if available
        if let Some(docs) = knowledge_base {
            prompt.push_str("KEY SALES PRINCIPLES:\n");
            
            // Extract most relevant chunks (limit to prevent token overflow)
            let relevant_chunks = self.extract_relevant_chunks(&docs, transcription, 3);
            for chunk in relevant_chunks {
                prompt.push_str(&format!("- {}\n", chunk));
            }
            prompt.push_str("\n");
        }

        // Add conversation context if available
        if let Some(ctx) = context {
            prompt.push_str(&format!("CONVERSATION CONTEXT:\n{}\n\n", ctx));
        }

        // Add current transcription
        prompt.push_str(&format!("CURRENT STATEMENT:\n{}\n\n", transcription));

        // Add instruction
        prompt.push_str("Based on the sales principles and current statement, provide a brief, actionable coaching suggestion.\n");
        prompt.push_str("Respond in JSON format:\n");
        prompt.push_str(r#"{"suggestion": "your advice", "confidence": 0.0-1.0, "action_items": ["item1", "item2"]}"#);

        Ok(prompt)
    }

    /// Extract most relevant chunks from knowledge base
    fn extract_relevant_chunks(
        &self,
        docs: &[KnowledgeDocument],
        query: &str,
        max_chunks: usize,
    ) -> Vec<String> {
        let mut relevant_chunks = Vec::new();
        let query_lower = query.to_lowercase();

        // Simple keyword matching (could be enhanced with embeddings)
        for doc in docs {
            for chunk in &doc.chunks {
                if chunk.to_lowercase().contains(&query_lower) ||
                   self.has_relevant_keywords(chunk, &query_lower) {
                    relevant_chunks.push(chunk.clone());
                    if relevant_chunks.len() >= max_chunks {
                        return relevant_chunks;
                    }
                }
            }
        }

        // If not enough relevant chunks found, add some general ones
        if relevant_chunks.len() < max_chunks {
            for doc in docs {
                for chunk in doc.chunks.iter().take(max_chunks - relevant_chunks.len()) {
                    if !relevant_chunks.contains(chunk) {
                        relevant_chunks.push(chunk.clone());
                    }
                }
                if relevant_chunks.len() >= max_chunks {
                    break;
                }
            }
        }

        relevant_chunks
    }

    /// Check if chunk contains relevant keywords
    fn has_relevant_keywords(&self, chunk: &str, query: &str) -> bool {
        // Sales-related keywords to check
        let keywords = ["objection", "price", "value", "close", "question", 
                       "mirror", "label", "empathy", "calibrated", "negotiation"];
        
        let chunk_lower = chunk.to_lowercase();
        keywords.iter().any(|kw| chunk_lower.contains(kw) && query.contains(kw))
    }

    /// Compress prompt to fit within token limits
    fn compress_prompt(&self, prompt: &str, max_chars: usize) -> String {
        if prompt.len() <= max_chars {
            return prompt.to_string();
        }

        // Keep the most important parts: instruction and current statement
        let parts: Vec<&str> = prompt.split("\n\n").collect();
        let mut compressed = String::new();

        // Always keep the instruction (last part)
        if let Some(instruction) = parts.last() {
            compressed = instruction.to_string();
        }

        // Add current statement if there's room
        for part in parts.iter().rev() {
            if part.contains("CURRENT STATEMENT:") {
                let new_prompt = format!("{}\n\n{}", part, compressed);
                if new_prompt.len() <= max_chars {
                    compressed = new_prompt;
                }
                break;
            }
        }

        // Add as much context as possible
        for part in parts.iter() {
            if !part.contains("CURRENT STATEMENT:") && !compressed.contains(part) {
                let new_prompt = format!("{}\n\n{}", compressed, part);
                if new_prompt.len() <= max_chars {
                    compressed = new_prompt;
                } else {
                    break;
                }
            }
        }

        compressed
    }

    /// Parse Ollama response into structured suggestion
    fn parse_coaching_response(&self, response: &str) -> Result<CoachingSuggestion> {
        // Try to parse as JSON first
        if let Ok(parsed) = serde_json::from_str::<CoachingSuggestion>(response) {
            return Ok(parsed);
        }

        // If not valid JSON, create a simple suggestion from the text
        warn!("⚠️ LED 6131: Response not valid JSON, using text as suggestion");
        
        Ok(CoachingSuggestion {
            suggestion: response.to_string(),
            confidence: 0.7,
            reasoning: None,
            action_items: vec![],
        })
    }

    /// Generate fallback coaching without Ollama
    pub fn generate_fallback_coaching(&self, transcription: &str) -> CoachingSuggestion {
        info!("🔄 LED 6200: Using rule-based fallback coaching");

        let suggestion = if transcription.to_lowercase().contains("price") {
            "Address price concerns by focusing on value and ROI. Ask: 'What would making this investment mean for your business?'"
        } else if transcription.to_lowercase().contains("think about it") {
            "They need time to process. Use a calibrated question: 'What specifically would you like to think through?'"
        } else if transcription.to_lowercase().contains("not interested") {
            "Acknowledge their position and explore: 'I understand. Before we end, what would have to change for this to be valuable to you?'"
        } else if transcription.to_lowercase().contains("how") {
            "They're seeking information. Provide a clear, concise answer and check understanding."
        } else {
            "Listen actively and ask open-ended questions to understand their perspective better."
        };

        CoachingSuggestion {
            suggestion: suggestion.to_string(),
            confidence: 0.5,
            reasoning: Some("Rule-based suggestion".to_string()),
            action_items: vec!["Continue active listening".to_string()],
        }
    }
}

// Tauri command to generate coaching
#[tauri::command]
pub async fn generate_ai_coaching(
    transcription: String,
    knowledge_base: Option<Vec<KnowledgeDocument>>,
    context: Option<String>,
) -> Result<CoachingSuggestion, String> {
    let service = OllamaCoachingService::new();
    
    // Check if Ollama is available
    let ollama_available = service.check_availability().await
        .unwrap_or(false);

    if ollama_available {
        // Try to generate with Ollama
        match service.generate_coaching(&transcription, knowledge_base, context).await {
            Ok(suggestion) => Ok(suggestion),
            Err(e) => {
                error!("Ollama generation failed: {}", e);
                // Fall back to rule-based
                Ok(service.generate_fallback_coaching(&transcription))
            }
        }
    } else {
        // Use fallback if Ollama not available
        Ok(service.generate_fallback_coaching(&transcription))
    }
}

// Tauri command to check Ollama availability
#[tauri::command]
pub async fn check_ollama_status() -> Result<bool, String> {
    let service = OllamaCoachingService::new();
    service.check_availability().await
        .map_err(|e| e.to_string())
}

// Tauri command to load knowledge base from storage
#[tauri::command]
pub fn load_knowledge_base() -> Result<Vec<KnowledgeDocument>, String> {
    // For now, return empty vec - can be enhanced to load from file/database
    // In production, this would load from persistent storage
    Ok(vec![])
}

// Tauri command to save knowledge base
#[tauri::command]
pub fn save_knowledge_base(documents: Vec<KnowledgeDocument>) -> Result<(), String> {
    // For now, just log - can be enhanced to save to file/database
    info!("💾 LED 6300: Saving {} documents to knowledge base", documents.len());
    Ok(())
}