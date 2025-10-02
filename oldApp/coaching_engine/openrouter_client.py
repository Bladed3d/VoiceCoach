"""
OpenRouter API Client for VoiceCoach - AI-Powered Real-Time Sales Coaching
Integrates GPT-4 Turbo and Claude-3.5 Sonnet for intelligent coaching prompt generation
"""

import asyncio
import aiohttp
import json
import logging
import time
from dataclasses import dataclass, asdict
from enum import Enum
from typing import List, Dict, Any, Optional, Union, AsyncGenerator
from contextlib import asynccontextmanager

from ..utils.led_breadcrumb import LEDBreadcrumbTrail


class CoachingModel(Enum):
    """Available coaching models on OpenRouter."""
    GPT_4_TURBO = "openai/gpt-4-turbo"
    CLAUDE_3_5_SONNET = "anthropic/claude-3.5-sonnet"
    GPT_4O = "openai/gpt-4o"
    CLAUDE_HAIKU = "anthropic/claude-3-haiku"
    
    @property
    def context_window(self) -> int:
        """Return context window size for each model."""
        return {
            self.GPT_4_TURBO: 128000,
            self.CLAUDE_3_5_SONNET: 200000,
            self.GPT_4O: 128000,
            self.CLAUDE_HAIKU: 200000
        }.get(self, 32000)
    
    @property
    def cost_per_1k_tokens(self) -> float:
        """Approximate cost per 1k tokens (input)."""
        return {
            self.GPT_4_TURBO: 0.01,
            self.CLAUDE_3_5_SONNET: 0.003,
            self.GPT_4O: 0.005,
            self.CLAUDE_HAIKU: 0.00025
        }.get(self, 0.01)


@dataclass
class CoachingContext:
    """Context for coaching prompt generation."""
    conversation_snippet: str
    sales_stage: str
    participant_roles: Dict[str, str]  # {"speaker_1": "salesperson", "speaker_2": "prospect"}
    call_duration_minutes: int
    key_topics_discussed: List[str]
    objections_detected: List[str]
    sentiment_analysis: Optional[Dict[str, float]] = None
    company_context: Optional[str] = None


@dataclass
class CoachingPrompt:
    """Structured coaching prompt response."""
    primary_suggestion: str
    confidence_score: float
    prompt_type: str
    urgency_level: str  # "low", "medium", "high", "critical"
    supporting_evidence: List[str]
    next_best_actions: List[str]
    knowledge_sources: List[str]
    estimated_impact: str  # "low", "medium", "high"
    implementation_difficulty: str  # "easy", "moderate", "challenging"
    model_used: str
    response_time_ms: int
    token_usage: Dict[str, int]


class OpenRouterClient:
    """
    High-performance OpenRouter API client for VoiceCoach real-time coaching.
    
    Features:
    - <2 second response time for coaching prompts
    - Intelligent model selection based on context complexity
    - Conversation context analysis and intent recognition
    - Sales methodology integration (SPIN, MEDDIC, Challenger)
    - Streaming responses for real-time coaching
    - Cost optimization with model fallbacks
    """
    
    def __init__(self, api_key: str, app_name: str = "VoiceCoach", app_url: str = "https://voicecoach.ai"):
        self.api_key = api_key
        self.app_name = app_name
        self.app_url = app_url
        self.base_url = "https://openrouter.ai/api/v1"
        
        # Performance tracking
        self.response_times = []
        self.token_usage_stats = {"input": 0, "output": 0, "total_cost": 0.0}
        
        # Coaching prompts cache for similar contexts
        self.context_cache = {}
        self.cache_hit_rate = 0.0
        
        # LED breadcrumb system for debugging
        self.logger = logging.getLogger(__name__)
        
        # Rate limiting and connection management
        self.max_concurrent_requests = 5
        self.request_semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        
        # Default coaching configuration
        self.default_config = {
            "temperature": 0.7,
            "max_tokens": 1000,
            "top_p": 0.9,
            "frequency_penalty": 0.1,
            "presence_penalty": 0.1
        }
        
        self.logger.info(f"OpenRouter client initialized for {app_name}")
    
    @asynccontextmanager
    async def get_session(self):
        """Async context manager for aiohttp session."""
        timeout = aiohttp.ClientTimeout(total=5.0, connect=2.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            yield session
    
    async def generate_coaching_prompt(
        self,
        context: CoachingContext,
        model: CoachingModel = CoachingModel.GPT_4_TURBO,
        priority: str = "balanced",  # "speed", "accuracy", "balanced", "cost_optimized"
        use_streaming: bool = True
    ) -> CoachingPrompt:
        """
        Generate intelligent coaching prompt based on conversation context.
        
        Args:
            context: Conversation context and sales stage information
            model: AI model to use for prompt generation
            priority: Performance priority (speed vs accuracy vs cost)
            use_streaming: Whether to use streaming for faster response
        
        Returns:
            Structured coaching prompt with actionable suggestions
        """
        trail = LEDBreadcrumbTrail("OpenRouterCoachingEngine")
        
        # LED 200: API request initiation
        trail.light(200, "COACHING_PROMPT_REQUEST_START", 
                   {"model": model.value, "stage": context.sales_stage})
        
        start_time = time.time()
        
        # LED 501: Context analysis and preprocessing
        trail.light(501, "CONTEXT_ANALYSIS_START", {"conversation_length": len(context.conversation_snippet)})
        
        # Check cache for similar contexts first
        cache_key = self._generate_cache_key(context, model)
        if cache_key in self.context_cache:
            cached_prompt = self.context_cache[cache_key]
            trail.light(502, "CACHE_HIT", {"cache_key": cache_key[:20]})
            self.cache_hit_rate = len([k for k in self.context_cache]) / (len(self.context_cache) + 1)
            return cached_prompt
        
        # Optimize model selection based on priority
        selected_model = self._select_optimal_model(context, model, priority)
        trail.light(503, "MODEL_SELECTION_COMPLETE", {"selected": selected_model.value})
        
        # Generate system prompt for coaching context
        system_prompt = self._build_coaching_system_prompt(context)
        user_prompt = self._build_user_prompt(context)
        
        trail.light(504, "PROMPT_GENERATION_COMPLETE", 
                   {"system_length": len(system_prompt), "user_length": len(user_prompt)})
        
        # Prepare API request
        request_payload = {
            "model": selected_model.value,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": use_streaming,
            **self.default_config
        }
        
        # LED 210: API request execution
        trail.light(210, "OPENROUTER_API_REQUEST_START", {"payload_size": len(json.dumps(request_payload))})
        
        try:
            if use_streaming:
                coaching_prompt = await self._process_streaming_response(request_payload, trail)
            else:
                coaching_prompt = await self._process_standard_response(request_payload, trail)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            coaching_prompt.response_time_ms = response_time_ms
            coaching_prompt.model_used = selected_model.value
            
            # Performance tracking
            self.response_times.append(response_time_ms)
            self._update_token_usage_stats(coaching_prompt.token_usage, selected_model)
            
            # Cache successful response
            self.context_cache[cache_key] = coaching_prompt
            
            # LED 211: API request completion
            trail.light(211, "OPENROUTER_API_REQUEST_COMPLETE", 
                       {"response_time_ms": response_time_ms, "confidence": coaching_prompt.confidence_score})
            
            # Performance validation
            if response_time_ms > 2000:
                trail.fail(212, "PERFORMANCE_TARGET_MISSED", 
                          f"Response time {response_time_ms}ms exceeds 2s target")
            else:
                trail.light(212, "PERFORMANCE_TARGET_MET", {"response_time_ms": response_time_ms})
            
            return coaching_prompt
            
        except Exception as e:
            trail.fail(210, "OPENROUTER_API_REQUEST_FAILED", str(e))
            # Fallback to cached response or default coaching
            return await self._generate_fallback_coaching(context, trail)
    
    async def _process_streaming_response(
        self, 
        request_payload: Dict[str, Any], 
        trail: LEDBreadcrumbTrail
    ) -> CoachingPrompt:
        """Process streaming response for real-time coaching."""
        trail.light(220, "STREAMING_RESPONSE_START", None)
        
        headers = self._get_request_headers()
        
        async with self.request_semaphore:
            async with self.get_session() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=request_payload,
                    headers=headers
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        trail.fail(220, "STREAMING_API_ERROR", f"Status {response.status}: {error_text}")
                        raise Exception(f"OpenRouter API error: {response.status}")
                    
                    # Process streaming chunks
                    accumulated_content = ""
                    token_count = {"input": 0, "output": 0}
                    
                    async for line in response.content:
                        line_text = line.decode('utf-8').strip()
                        if line_text.startswith('data: '):
                            chunk_data = line_text[6:]
                            if chunk_data == '[DONE]':
                                break
                            
                            try:
                                chunk = json.loads(chunk_data)
                                if 'choices' in chunk and chunk['choices']:
                                    delta = chunk['choices'][0].get('delta', {})
                                    if 'content' in delta:
                                        accumulated_content += delta['content']
                                        
                                if 'usage' in chunk:
                                    token_count.update(chunk['usage'])
                                    
                            except json.JSONDecodeError:
                                continue
                    
                    trail.light(221, "STREAMING_RESPONSE_COMPLETE", {"content_length": len(accumulated_content)})
                    
                    return self._parse_coaching_response(accumulated_content, token_count, trail)
    
    async def _process_standard_response(
        self, 
        request_payload: Dict[str, Any], 
        trail: LEDBreadcrumbTrail
    ) -> CoachingPrompt:
        """Process standard (non-streaming) response."""
        trail.light(225, "STANDARD_RESPONSE_START", None)
        
        headers = self._get_request_headers()
        
        async with self.request_semaphore:
            async with self.get_session() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=request_payload,
                    headers=headers
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        trail.fail(225, "STANDARD_API_ERROR", f"Status {response.status}: {error_text}")
                        raise Exception(f"OpenRouter API error: {response.status}")
                    
                    response_data = await response.json()
                    trail.light(226, "STANDARD_RESPONSE_COMPLETE", {"response_keys": list(response_data.keys())})
                    
                    content = response_data['choices'][0]['message']['content']
                    token_usage = response_data.get('usage', {"prompt_tokens": 0, "completion_tokens": 0})
                    
                    return self._parse_coaching_response(content, token_usage, trail)
    
    def _parse_coaching_response(
        self, 
        content: str, 
        token_usage: Dict[str, int], 
        trail: LEDBreadcrumbTrail
    ) -> CoachingPrompt:
        """Parse AI response into structured coaching prompt."""
        trail.light(510, "RESPONSE_PARSING_START", {"content_length": len(content)})
        
        try:
            # Attempt to parse as JSON first (structured response)
            if content.strip().startswith('{'):
                parsed_data = json.loads(content)
                trail.light(511, "JSON_PARSING_SUCCESS", None)
                
                return CoachingPrompt(
                    primary_suggestion=parsed_data.get("primary_suggestion", ""),
                    confidence_score=parsed_data.get("confidence_score", 0.5),
                    prompt_type=parsed_data.get("prompt_type", "general"),
                    urgency_level=parsed_data.get("urgency_level", "medium"),
                    supporting_evidence=parsed_data.get("supporting_evidence", []),
                    next_best_actions=parsed_data.get("next_best_actions", []),
                    knowledge_sources=parsed_data.get("knowledge_sources", []),
                    estimated_impact=parsed_data.get("estimated_impact", "medium"),
                    implementation_difficulty=parsed_data.get("implementation_difficulty", "moderate"),
                    model_used="",  # Will be set by caller
                    response_time_ms=0,  # Will be set by caller
                    token_usage=token_usage
                )
                
        except json.JSONDecodeError:
            # Fall back to text parsing
            trail.light(512, "TEXT_PARSING_FALLBACK", None)
            
        # Parse unstructured text response
        lines = content.split('\n')
        primary_suggestion = lines[0] if lines else "Continue the conversation naturally."
        
        # Extract action items (lines starting with bullet points or numbers)
        actions = [line.strip() for line in lines if line.strip().startswith(('•', '-', '*', '1.', '2.', '3.'))]
        
        # Calculate confidence based on response quality indicators
        confidence = self._calculate_response_confidence(content)
        
        trail.light(513, "RESPONSE_PARSING_COMPLETE", {"confidence": confidence})
        
        return CoachingPrompt(
            primary_suggestion=primary_suggestion,
            confidence_score=confidence,
            prompt_type="contextual",
            urgency_level="medium",
            supporting_evidence=[],
            next_best_actions=actions[:3],  # Top 3 actions
            knowledge_sources=["OpenRouter AI Analysis"],
            estimated_impact="medium",
            implementation_difficulty="moderate",
            model_used="",  # Will be set by caller
            response_time_ms=0,  # Will be set by caller
            token_usage=token_usage
        )
    
    def _build_coaching_system_prompt(self, context: CoachingContext) -> str:
        """Build comprehensive system prompt for sales coaching."""
        return f"""You are VoiceCoach, an expert AI sales coach providing real-time guidance during sales conversations.

CURRENT CONTEXT:
- Sales Stage: {context.sales_stage}
- Call Duration: {context.call_duration_minutes} minutes
- Key Topics: {', '.join(context.key_topics_discussed)}
- Detected Objections: {', '.join(context.objections_detected)}
- Participants: {', '.join([f"{role} ({speaker})" for speaker, role in context.participant_roles.items()])}

COACHING OBJECTIVES:
1. Provide actionable, specific suggestions for the salesperson
2. Address objections and concerns with proven responses
3. Guide conversation toward successful close
4. Maintain rapport and trust with prospect
5. Optimize for sales methodology best practices (SPIN, MEDDIC, Challenger)

RESPONSE FORMAT:
Provide a JSON response with these fields:
{{
    "primary_suggestion": "Main coaching advice (1-2 sentences)",
    "confidence_score": 0.0-1.0,
    "prompt_type": "objection_handling|discovery|demo|closing|rapport_building|general",
    "urgency_level": "low|medium|high|critical",
    "supporting_evidence": ["Evidence point 1", "Evidence point 2"],
    "next_best_actions": ["Action 1", "Action 2", "Action 3"],
    "knowledge_sources": ["Source 1", "Source 2"],
    "estimated_impact": "low|medium|high",
    "implementation_difficulty": "easy|moderate|challenging"
}}

COACHING PRINCIPLES:
- Be specific and actionable, not generic
- Focus on what the salesperson should do RIGHT NOW
- Consider the prospect's perspective and emotional state
- Suggest exact phrases or questions when helpful
- Prioritize relationship preservation over aggressive tactics
"""

    def _build_user_prompt(self, context: CoachingContext) -> str:
        """Build user prompt with conversation context."""
        sentiment_info = ""
        if context.sentiment_analysis:
            sentiment_info = f"\nSentiment Analysis: {context.sentiment_analysis}"
        
        company_info = ""
        if context.company_context:
            company_info = f"\nCompany Context: {context.company_context}"
        
        return f"""CURRENT CONVERSATION SNIPPET:
{context.conversation_snippet}

{sentiment_info}{company_info}

Please provide coaching guidance for the salesperson based on this conversation context. What should they do or say next to advance the sale while maintaining rapport?"""
    
    def _select_optimal_model(
        self, 
        context: CoachingContext, 
        preferred_model: CoachingModel, 
        priority: str
    ) -> CoachingModel:
        """Select optimal model based on context complexity and priority."""
        
        # Calculate context complexity
        complexity_score = self._calculate_context_complexity(context)
        
        if priority == "speed":
            return CoachingModel.CLAUDE_HAIKU if complexity_score < 0.3 else CoachingModel.GPT_4O
        elif priority == "cost_optimized":
            return CoachingModel.CLAUDE_HAIKU
        elif priority == "accuracy":
            return CoachingModel.CLAUDE_3_5_SONNET if complexity_score > 0.7 else CoachingModel.GPT_4_TURBO
        else:  # balanced
            if complexity_score > 0.8:
                return CoachingModel.CLAUDE_3_5_SONNET
            elif complexity_score > 0.5:
                return preferred_model
            else:
                return CoachingModel.GPT_4O
    
    def _calculate_context_complexity(self, context: CoachingContext) -> float:
        """Calculate complexity score for context (0.0 to 1.0)."""
        complexity = 0.0
        
        # Conversation length factor
        complexity += min(len(context.conversation_snippet) / 2000, 0.3)
        
        # Number of topics factor
        complexity += min(len(context.key_topics_discussed) / 5, 0.2)
        
        # Objections detected factor
        complexity += min(len(context.objections_detected) / 3, 0.2)
        
        # Sales stage factor (later stages are more complex)
        stage_complexity = {
            "prospecting": 0.1,
            "discovery": 0.2,
            "demo": 0.3,
            "proposal": 0.4,
            "negotiation": 0.5,
            "closing": 0.3
        }
        complexity += stage_complexity.get(context.sales_stage.lower(), 0.2)
        
        # Call duration factor (longer calls are more complex)
        complexity += min(context.call_duration_minutes / 60, 0.1)
        
        return min(complexity, 1.0)
    
    def _calculate_response_confidence(self, content: str) -> float:
        """Calculate confidence score based on response quality indicators."""
        confidence = 0.5  # Base confidence
        
        # Length factor (too short or too long reduces confidence)
        if 50 <= len(content) <= 500:
            confidence += 0.2
        elif len(content) < 20:
            confidence -= 0.3
        
        # Structure indicators
        if any(indicator in content.lower() for indicator in ['because', 'specifically', 'suggest', 'recommend']):
            confidence += 0.1
        
        # Action orientation
        if any(action in content.lower() for action in ['ask', 'say', 'tell', 'show', 'explain']):
            confidence += 0.1
        
        # Sales terminology
        sales_terms = ['objection', 'benefit', 'value', 'roi', 'solution', 'pain point', 'decision']
        if any(term in content.lower() for term in sales_terms):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _generate_cache_key(self, context: CoachingContext, model: CoachingModel) -> str:
        """Generate cache key for similar contexts."""
        key_elements = [
            context.sales_stage,
            str(len(context.conversation_snippet) // 100),  # Bucket by conversation length
            str(len(context.objections_detected)),
            model.value
        ]
        return "|".join(key_elements)
    
    async def _generate_fallback_coaching(
        self, 
        context: CoachingContext, 
        trail: LEDBreadcrumbTrail
    ) -> CoachingPrompt:
        """Generate fallback coaching when API fails."""
        trail.light(299, "FALLBACK_COACHING_GENERATED", {"stage": context.sales_stage})
        
        stage_prompts = {
            "discovery": "Ask open-ended questions to understand their pain points better.",
            "demo": "Focus on features that directly address their stated needs.",
            "objection_handling": "Acknowledge their concern and ask clarifying questions.",
            "closing": "Summarize the value and ask for their commitment.",
            "negotiation": "Find win-win solutions that address their budget concerns."
        }
        
        primary_suggestion = stage_prompts.get(
            context.sales_stage.lower(), 
            "Listen actively and build rapport with the prospect."
        )
        
        return CoachingPrompt(
            primary_suggestion=primary_suggestion,
            confidence_score=0.3,
            prompt_type="fallback",
            urgency_level="medium",
            supporting_evidence=["Sales best practices"],
            next_best_actions=["Listen actively", "Ask questions", "Build rapport"],
            knowledge_sources=["VoiceCoach fallback system"],
            estimated_impact="medium",
            implementation_difficulty="easy",
            model_used="fallback",
            response_time_ms=0,
            token_usage={"input": 0, "output": 0}
        )
    
    def _get_request_headers(self) -> Dict[str, str]:
        """Get headers for OpenRouter API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.app_url,
            "X-Title": self.app_name
        }
    
    def _update_token_usage_stats(self, token_usage: Dict[str, int], model: CoachingModel):
        """Update token usage statistics and cost tracking."""
        input_tokens = token_usage.get("prompt_tokens", 0)
        output_tokens = token_usage.get("completion_tokens", 0)
        
        self.token_usage_stats["input"] += input_tokens
        self.token_usage_stats["output"] += output_tokens
        
        # Calculate cost (approximate)
        total_tokens = input_tokens + output_tokens
        cost = (total_tokens / 1000) * model.cost_per_1k_tokens
        self.token_usage_stats["total_cost"] += cost
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics."""
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        
        return {
            "performance": {
                "avg_response_time_ms": round(avg_response_time, 2),
                "target_response_time_ms": 2000,
                "performance_status": "✅ OPTIMAL" if avg_response_time < 2000 else "⚠️ NEEDS OPTIMIZATION",
                "total_requests": len(self.response_times),
                "cache_hit_rate": round(self.cache_hit_rate * 100, 1)
            },
            "token_usage": self.token_usage_stats,
            "model_capabilities": {
                model.name: {
                    "context_window": model.context_window,
                    "cost_per_1k_tokens": model.cost_per_1k_tokens
                } for model in CoachingModel
            }
        }


# Global instance for VoiceCoach application
openrouter_client = None

def initialize_openrouter_client(api_key: str) -> OpenRouterClient:
    """Initialize global OpenRouter client instance."""
    global openrouter_client
    openrouter_client = OpenRouterClient(api_key)
    return openrouter_client