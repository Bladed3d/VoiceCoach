"""
OpenRouter API Integration for Real-time Coaching Prompts
LED Breadcrumb-Enabled Coaching Pipeline with <2 Second Response Time

This module provides OpenRouter API integration for generating coaching prompts based on
real-time voice transcription with comprehensive LED debugging infrastructure.
"""

import os
import json
import time
import asyncio
import aiohttp
import threading
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import IntEnum
import logging
from ai_breadcrumb_system import AIBreadcrumbTrail, get_ai_trail

# Set up logging for OpenRouter coaching system
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("OpenRouterCoaching")

class CoachingLEDRanges(IntEnum):
    """LED numbering ranges for OpenRouter coaching pipeline operations"""
    
    # 700-799: OpenRouter API Communication
    OPENROUTER_AUTH_INIT = 700
    OPENROUTER_CONNECTION_TEST = 701
    OPENROUTER_MODEL_SELECTION = 702
    OPENROUTER_REQUEST_START = 703
    OPENROUTER_REQUEST_SENT = 704
    OPENROUTER_RESPONSE_RECEIVED = 705
    OPENROUTER_RESPONSE_PARSED = 706
    OPENROUTER_ERROR_HANDLING = 707
    OPENROUTER_RATE_LIMIT = 708
    OPENROUTER_TIMEOUT = 709
    
    # 800-899: Coaching Context Analysis  
    CONTEXT_ANALYSIS_START = 800
    CONTEXT_CONVERSATION_PARSE = 801
    CONTEXT_SPEAKER_IDENTIFICATION = 802
    CONTEXT_SENTIMENT_ANALYSIS = 803
    CONTEXT_TOPIC_EXTRACTION = 804
    CONTEXT_INTENT_DETECTION = 805
    CONTEXT_PREPARATION_COMPLETE = 806
    CONTEXT_EMBEDDING_GENERATION = 807
    CONTEXT_SIMILARITY_SEARCH = 808
    CONTEXT_RELEVANCE_SCORING = 809
    
    # 900-999: Coaching Prompt Generation
    PROMPT_GENERATION_START = 900
    PROMPT_TEMPLATE_SELECTION = 901
    PROMPT_PERSONALIZATION = 902
    PROMPT_GPT4_TURBO_CALL = 903
    PROMPT_CLAUDE_SONNET_CALL = 904
    PROMPT_RESPONSE_EVALUATION = 905
    PROMPT_QUALITY_CHECK = 906
    PROMPT_FORMATTING = 907
    PROMPT_DELIVERY_READY = 908
    PROMPT_FALLBACK_TRIGGERED = 909
    
    # 1000-1099: RAG Knowledge Integration
    RAG_KNOWLEDGE_SEARCH = 1000
    RAG_CHROMADB_QUERY = 1001
    RAG_VECTOR_SIMILARITY = 1002
    RAG_KNOWLEDGE_RETRIEVAL = 1003
    RAG_CONTEXT_INJECTION = 1004
    RAG_KNOWLEDGE_RANKING = 1005
    RAG_RESPONSE_AUGMENTATION = 1006
    RAG_RELEVANCE_FILTERING = 1007
    RAG_KNOWLEDGE_CACHING = 1008
    RAG_EMBEDDING_UPDATE = 1009
    
    # 1100-1199: Performance & Tauri Integration
    PERFORMANCE_LATENCY_TARGET = 1100
    PERFORMANCE_RESPONSE_TIME = 1101
    PERFORMANCE_CACHE_HIT = 1102
    PERFORMANCE_CACHE_MISS = 1103
    TAURI_IPC_SEND = 1104
    TAURI_IPC_RECEIVE = 1105
    TAURI_UI_UPDATE = 1106
    TAURI_COACHING_DISPLAY = 1107
    TAURI_ERROR_NOTIFICATION = 1108
    TAURI_PERFORMANCE_METRICS = 1109

@dataclass
class CoachingContext:
    """Context for coaching prompt generation"""
    conversation_history: List[Dict[str, str]]
    current_speaker: str  # 'user' or 'prospect' 
    conversation_topic: str
    sentiment_score: float
    intent_detected: str
    context_embedding: Optional[List[float]] = None
    rag_knowledge: Optional[List[Dict[str, Any]]] = None
    timestamp: float = None

@dataclass
class CoachingPrompt:
    """Generated coaching prompt with metadata"""
    prompt_text: str
    confidence: float
    model_used: str
    generation_time_ms: float
    rag_sources: List[str]
    coaching_type: str  # 'question', 'objection_handling', 'closing', 'rapport'
    urgency_level: int  # 1-5, 5 being immediate intervention needed
    timestamp: float

class OpenRouterCoachingSystem:
    """
    OpenRouter API integration for real-time coaching prompt generation.
    Provides <2 second response time with comprehensive LED debugging.
    """
    
    def __init__(self, openrouter_api_key: str = None, max_response_time_ms: float = 2000):
        """
        Initialize OpenRouter coaching system with LED breadcrumb trail.
        
        Args:
            openrouter_api_key: OpenRouter API key (can be loaded from env)
            max_response_time_ms: Maximum acceptable response time in milliseconds
        """
        # Initialize coaching breadcrumb trail
        self.trail = get_ai_trail("OpenRouterCoaching")
        self.trail.light(CoachingLEDRanges.OPENROUTER_AUTH_INIT, "coaching_system_init")
        
        # API Configuration
        self.api_key = openrouter_api_key or os.getenv('OPENROUTER_API_KEY')
        if not self.api_key:
            self.trail.fail(CoachingLEDRanges.OPENROUTER_AUTH_INIT, 
                          Exception("OpenRouter API key not found"), 
                          "missing_api_key")
            raise ValueError("OpenRouter API key required")
        
        self.base_url = "https://openrouter.ai/api/v1"
        self.max_response_time = max_response_time_ms
        
        # Model Configuration for Coaching
        self.coaching_models = {
            'primary': 'openai/gpt-4-turbo',
            'fallback': 'anthropic/claude-3.5-sonnet',
            'fast': 'openai/gpt-3.5-turbo'
        }
        
        # Performance tracking
        self.response_times = []
        self.cache = {}  # Simple prompt caching
        self.request_count = 0
        self.success_count = 0
        
        # Coaching context management
        self.conversation_buffer = []
        self.current_context: Optional[CoachingContext] = None
        
        # HTTP session for connection pooling
        self.session = None
        self.event_loop = None
        
        self.trail.light(CoachingLEDRanges.OPENROUTER_MODEL_SELECTION, "models_configured", 
                        {'primary': self.coaching_models['primary'],
                         'fallback': self.coaching_models['fallback']})
        
        # Initialize async session
        self._init_async_session()
        
        self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "system_ready")
    
    def _init_async_session(self):
        """Initialize async HTTP session for OpenRouter API calls."""
        try:
            # Create event loop if not running in one
            try:
                self.event_loop = asyncio.get_event_loop()
            except RuntimeError:
                self.event_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self.event_loop)
            
            # Configure session with connection pooling and timeouts
            timeout = aiohttp.ClientTimeout(total=self.max_response_time / 1000)
            connector = aiohttp.TCPConnector(
                limit=10,  # Total connection pool size
                limit_per_host=5,  # Connections per host
                ttl_dns_cache=300,  # DNS cache TTL
                use_dns_cache=True,
            )
            
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://voice-coach-app.com',
                    'X-Title': 'Voice Coach Real-time Coaching'
                }
            )
            
            logger.info("OpenRouter async session initialized")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, e, "session_init_failed")
            raise
    
    async def test_connection(self) -> bool:
        """Test OpenRouter API connection and model availability."""
        self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "testing_connection")
        
        try:
            start_time = time.time()
            
            async with self.session.get(f"{self.base_url}/models") as response:
                response_time_ms = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    models = await response.json()
                    available_models = [model['id'] for model in models['data']]
                    
                    # Check if our coaching models are available
                    primary_available = self.coaching_models['primary'] in available_models
                    fallback_available = self.coaching_models['fallback'] in available_models
                    
                    performance_metrics = {
                        'response_time_ms': response_time_ms,
                        'models_available': len(available_models),
                        'primary_model_available': primary_available,
                        'fallback_model_available': fallback_available
                    }
                    
                    self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, 
                                   "connection_successful", 
                                   performance_metrics=performance_metrics)
                    
                    return primary_available or fallback_available
                else:
                    self.trail.fail(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST,
                                  Exception(f"API responded with status {response.status}"),
                                  "connection_failed")
                    return False
                    
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, e, "connection_error")
            return False
    
    def process_transcription(self, transcription_text: str, speaker: str, 
                            timestamp: float = None) -> Optional[CoachingPrompt]:
        """
        Process new transcription and generate coaching prompt if needed.
        
        Args:
            transcription_text: Latest transcribed text
            speaker: 'user' or 'prospect'
            timestamp: Timestamp of transcription
            
        Returns:
            CoachingPrompt if generated, None otherwise
        """
        self.trail.light(CoachingLEDRanges.CONTEXT_ANALYSIS_START, "processing_transcription",
                        {'speaker': speaker, 'text_length': len(transcription_text)})
        
        if timestamp is None:
            timestamp = time.time()
        
        # Add to conversation buffer
        self.conversation_buffer.append({
            'speaker': speaker,
            'text': transcription_text,
            'timestamp': timestamp
        })
        
        # Keep buffer manageable (last 20 exchanges)
        if len(self.conversation_buffer) > 20:
            self.conversation_buffer = self.conversation_buffer[-20:]
        
        # Analyze context for coaching opportunity
        context = self._analyze_conversation_context()
        
        if self._should_generate_coaching_prompt(context):
            # Generate coaching prompt asynchronously but return synchronously
            return self._generate_coaching_prompt_sync(context)
        
        return None
    
    def _analyze_conversation_context(self) -> CoachingContext:
        """Analyze current conversation context for coaching opportunities."""
        self.trail.light(CoachingLEDRanges.CONTEXT_CONVERSATION_PARSE, "analyzing_context")
        
        if not self.conversation_buffer:
            return CoachingContext([], 'unknown', 'general', 0.0, 'none')
        
        # Get recent conversation (last 5 exchanges)
        recent_conversation = self.conversation_buffer[-5:]
        
        # Determine current speaker
        current_speaker = recent_conversation[-1]['speaker'] if recent_conversation else 'unknown'
        
        # Simple topic extraction (this could be enhanced with NLP)
        conversation_text = " ".join([msg['text'] for msg in recent_conversation])
        topic = self._extract_topic(conversation_text)
        
        # Simple sentiment analysis (placeholder - could use proper sentiment model)
        sentiment = self._analyze_sentiment(conversation_text)
        
        # Intent detection
        intent = self._detect_intent(conversation_text, current_speaker)
        
        context = CoachingContext(
            conversation_history=recent_conversation,
            current_speaker=current_speaker,
            conversation_topic=topic,
            sentiment_score=sentiment,
            intent_detected=intent,
            timestamp=time.time()
        )
        
        self.trail.light(CoachingLEDRanges.CONTEXT_PREPARATION_COMPLETE, "context_analyzed",
                        {'topic': topic, 'sentiment': sentiment, 'intent': intent})
        
        self.current_context = context
        return context
    
    def _should_generate_coaching_prompt(self, context: CoachingContext) -> bool:
        """Determine if coaching prompt should be generated based on context."""
        # Coaching triggers
        coaching_triggers = [
            'objection' in context.intent_detected.lower(),
            context.sentiment_score < -0.3,  # Negative sentiment
            'question' in context.intent_detected.lower(),
            'closing' in context.intent_detected.lower(),
            len(context.conversation_history) > 0 and 
            context.conversation_history[-1]['speaker'] == 'prospect'
        ]
        
        should_coach = any(coaching_triggers)
        
        self.trail.light(CoachingLEDRanges.CONTEXT_INTENT_DETECTION, "coaching_decision",
                        {'should_coach': should_coach, 'triggers': sum(coaching_triggers)})
        
        return should_coach
    
    def _generate_coaching_prompt_sync(self, context: CoachingContext) -> Optional[CoachingPrompt]:
        """Generate coaching prompt synchronously by running async function."""
        try:
            # Run async function in event loop
            if self.event_loop and self.event_loop.is_running():
                # If we're already in an event loop, create a task
                task = asyncio.create_task(self._generate_coaching_prompt(context))
                # This is a simplified approach - in production you'd want proper async handling
                return None  # Return None for now to avoid blocking
            else:
                # Run in new event loop
                return self.event_loop.run_until_complete(self._generate_coaching_prompt(context))
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.PROMPT_GENERATION_START, e, "sync_async_conversion")
            return None
    
    async def _generate_coaching_prompt(self, context: CoachingContext) -> Optional[CoachingPrompt]:
        """Generate coaching prompt using OpenRouter API."""
        self.trail.light(CoachingLEDRanges.PROMPT_GENERATION_START, "generating_prompt")
        
        start_time = time.time()
        self.request_count += 1
        
        # Check cache first
        cache_key = self._generate_cache_key(context)
        if cache_key in self.cache:
            self.trail.light(CoachingLEDRanges.PERFORMANCE_CACHE_HIT, "cache_hit")
            return self.cache[cache_key]
        
        self.trail.light(CoachingLEDRanges.PERFORMANCE_CACHE_MISS, "cache_miss")
        
        try:
            # Prepare coaching prompt based on context
            system_prompt = self._build_coaching_system_prompt(context)
            user_prompt = self._build_coaching_user_prompt(context)
            
            # Try primary model first (GPT-4 Turbo)
            prompt = await self._call_openrouter_model(
                self.coaching_models['primary'],
                system_prompt,
                user_prompt,
                CoachingLEDRanges.PROMPT_GPT4_TURBO_CALL
            )
            
            if not prompt:
                # Fallback to Claude Sonnet
                self.trail.light(CoachingLEDRanges.PROMPT_FALLBACK_TRIGGERED, "using_fallback_model")
                prompt = await self._call_openrouter_model(
                    self.coaching_models['fallback'],
                    system_prompt,
                    user_prompt,
                    CoachingLEDRanges.PROMPT_CLAUDE_SONNET_CALL
                )
            
            if prompt:
                generation_time = (time.time() - start_time) * 1000
                
                coaching_prompt = CoachingPrompt(
                    prompt_text=prompt['text'],
                    confidence=prompt['confidence'],
                    model_used=prompt['model'],
                    generation_time_ms=generation_time,
                    rag_sources=prompt.get('sources', []),
                    coaching_type=self._classify_coaching_type(context),
                    urgency_level=self._assess_urgency(context),
                    timestamp=time.time()
                )
                
                # Cache the result
                self.cache[cache_key] = coaching_prompt
                
                # Track performance
                self.response_times.append(generation_time)
                self.success_count += 1
                
                performance_metrics = {
                    'generation_time_ms': generation_time,
                    'under_target_time': generation_time < self.max_response_time,
                    'success_rate': self.success_count / self.request_count * 100
                }
                
                self.trail.light(CoachingLEDRanges.PROMPT_DELIVERY_READY, "prompt_generated",
                               performance_metrics=performance_metrics)
                
                return coaching_prompt
            else:
                self.trail.fail(CoachingLEDRanges.PROMPT_GENERATION_START,
                              Exception("All models failed to generate prompt"),
                              "all_models_failed")
                return None
                
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.PROMPT_GENERATION_START, e, "prompt_generation_error")
            return None
    
    async def _call_openrouter_model(self, model: str, system_prompt: str, 
                                   user_prompt: str, led_id: int) -> Optional[Dict[str, Any]]:
        """Call OpenRouter API with specific model."""
        self.trail.light(led_id, f"calling_{model.replace('/', '_')}")
        
        request_start = time.time()
        
        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 150,  # Keep coaching prompts concise
                "temperature": 0.7,
                "top_p": 0.9,
                "stream": False
            }
            
            self.trail.light(CoachingLEDRanges.OPENROUTER_REQUEST_START, "sending_request",
                           {'model': model, 'payload_size': len(json.dumps(payload))})
            
            async with self.session.post(
                f"{self.base_url}/chat/completions",
                json=payload
            ) as response:
                
                request_time = (time.time() - request_start) * 1000
                
                self.trail.light(CoachingLEDRanges.OPENROUTER_RESPONSE_RECEIVED, "response_received",
                               performance_metrics={'request_time_ms': request_time})
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Extract coaching prompt
                    if data.get('choices') and len(data['choices']) > 0:
                        content = data['choices'][0]['message']['content']
                        
                        # Calculate confidence based on response metadata
                        confidence = self._calculate_response_confidence(data)
                        
                        result = {
                            'text': content.strip(),
                            'confidence': confidence,
                            'model': model,
                            'request_time_ms': request_time
                        }
                        
                        self.trail.light(CoachingLEDRanges.OPENROUTER_RESPONSE_PARSED, "response_parsed",
                                       {'confidence': confidence, 'response_length': len(content)})
                        
                        return result
                    else:
                        self.trail.fail(led_id, Exception("Empty response from model"), "empty_response")
                        return None
                        
                elif response.status == 429:
                    # Rate limit hit
                    self.trail.light(CoachingLEDRanges.OPENROUTER_RATE_LIMIT, "rate_limit_hit")
                    await asyncio.sleep(1)  # Brief backoff
                    return None
                    
                else:
                    error_text = await response.text()
                    self.trail.fail(led_id, Exception(f"API error {response.status}: {error_text}"), 
                                  "api_error")
                    return None
                    
        except asyncio.TimeoutError:
            self.trail.fail(CoachingLEDRanges.OPENROUTER_TIMEOUT, 
                          Exception("Request timeout"), "timeout_exceeded")
            return None
        except Exception as e:
            self.trail.fail(led_id, e, f"model_call_failed_{model}")
            return None
    
    def _build_coaching_system_prompt(self, context: CoachingContext) -> str:
        """Build system prompt for coaching based on context."""
        return f"""You are an expert sales coaching AI providing real-time guidance to a salesperson during a live conversation.

CONTEXT:
- Current conversation topic: {context.conversation_topic}
- Prospect sentiment: {context.sentiment_score}
- Detected intent: {context.intent_detected}
- Current speaker: {context.current_speaker}

GUIDELINES:
- Provide specific, actionable coaching in 1-2 sentences
- Focus on immediate next steps or responses
- Be concise and practical for real-time use
- Consider the conversation flow and timing
- Prioritize rapport building and value creation

RESPONSE FORMAT:
Provide a coaching prompt that helps the salesperson respond effectively to the current situation."""
    
    def _build_coaching_user_prompt(self, context: CoachingContext) -> str:
        """Build user prompt with conversation history."""
        conversation_text = "\n".join([
            f"{msg['speaker']}: {msg['text']}" 
            for msg in context.conversation_history[-3:]  # Last 3 exchanges
        ])
        
        return f"""Recent conversation:
{conversation_text}

Based on this conversation, what specific coaching guidance should I provide to help the salesperson respond effectively? Focus on the immediate situation and next best action."""
    
    def _extract_topic(self, text: str) -> str:
        """Extract conversation topic (simplified implementation)."""
        # This is a simplified implementation - could be enhanced with NLP
        keywords = {
            'pricing': ['price', 'cost', 'expensive', 'budget', 'money'],
            'product': ['feature', 'benefit', 'functionality', 'product'],
            'timeline': ['when', 'schedule', 'timeline', 'deadline'],
            'competition': ['competitor', 'alternative', 'compare'],
            'decision': ['decide', 'decision', 'think', 'consider']
        }
        
        text_lower = text.lower()
        for topic, words in keywords.items():
            if any(word in text_lower for word in words):
                return topic
        
        return 'general'
    
    def _analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment (simplified implementation)."""
        # Simplified sentiment analysis - could be enhanced with proper sentiment model
        positive_words = ['great', 'good', 'excellent', 'perfect', 'love', 'yes', 'absolutely']
        negative_words = ['no', 'bad', 'terrible', 'expensive', 'difficult', 'problem', 'issue']
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count + neg_count == 0:
            return 0.0
        
        return (pos_count - neg_count) / (pos_count + neg_count)
    
    def _detect_intent(self, text: str, speaker: str) -> str:
        """Detect conversation intent (simplified implementation)."""
        text_lower = text.lower()
        
        if speaker == 'prospect':
            if any(word in text_lower for word in ['question', 'how', 'what', 'why', 'when', 'where']):
                return 'question'
            elif any(word in text_lower for word in ['no', 'not', 'but', 'however', 'concern']):
                return 'objection'
            elif any(word in text_lower for word in ['ready', 'move', 'proceed', 'next']):
                return 'ready_to_advance'
        else:  # user (salesperson)
            if any(word in text_lower for word in ['close', 'sign', 'agreement', 'contract']):
                return 'closing_attempt'
            elif any(word in text_lower for word in ['tell', 'about', 'explain', 'show']):
                return 'presenting'
        
        return 'general_conversation'
    
    def _classify_coaching_type(self, context: CoachingContext) -> str:
        """Classify the type of coaching needed."""
        intent = context.intent_detected
        
        if 'objection' in intent:
            return 'objection_handling'
        elif 'question' in intent:
            return 'question_response'
        elif 'closing' in intent:
            return 'closing_guidance'
        elif context.sentiment_score < -0.2:
            return 'rapport_building'
        else:
            return 'general_guidance'
    
    def _assess_urgency(self, context: CoachingContext) -> int:
        """Assess urgency level (1-5 scale)."""
        urgency = 1
        
        if 'objection' in context.intent_detected:
            urgency += 2
        if context.sentiment_score < -0.3:
            urgency += 2
        if context.current_speaker == 'prospect':
            urgency += 1
        
        return min(urgency, 5)
    
    def _calculate_response_confidence(self, api_response: Dict[str, Any]) -> float:
        """Calculate confidence score based on API response metadata."""
        # This is a simplified implementation
        # In practice, you might use token probabilities, response length, etc.
        return 0.85  # Default confidence
    
    def _generate_cache_key(self, context: CoachingContext) -> str:
        """Generate cache key for coaching context."""
        # Simple cache key based on recent conversation and intent
        recent_text = " ".join([msg['text'] for msg in context.conversation_history[-2:]])
        return f"{context.intent_detected}_{hash(recent_text) % 10000}"
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics for the coaching system."""
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        
        return {
            'total_requests': self.request_count,
            'successful_requests': self.success_count,
            'success_rate': self.success_count / self.request_count * 100 if self.request_count > 0 else 0,
            'average_response_time_ms': avg_response_time,
            'under_target_rate': len([t for t in self.response_times if t < self.max_response_time]) / len(self.response_times) * 100 if self.response_times else 0,
            'cache_size': len(self.cache),
            'conversation_buffer_size': len(self.conversation_buffer)
        }
    
    async def cleanup(self):
        """Cleanup resources."""
        if self.session:
            await self.session.close()
        
        self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "system_shutdown")

# Global coaching system instance
coaching_system: Optional[OpenRouterCoachingSystem] = None

def get_coaching_system(api_key: str = None) -> OpenRouterCoachingSystem:
    """Get or create global coaching system instance."""
    global coaching_system
    if coaching_system is None:
        coaching_system = OpenRouterCoachingSystem(api_key)
    return coaching_system

def initialize_coaching_system(api_key: str = None) -> bool:
    """Initialize the coaching system and test connection."""
    try:
        system = get_coaching_system(api_key)
        # Test connection asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        connection_ok = loop.run_until_complete(system.test_connection())
        loop.close()
        return connection_ok
    except Exception as e:
        logger.error(f"Failed to initialize coaching system: {e}")
        return False

if __name__ == "__main__":
    # Example usage and testing
    import asyncio
    
    async def test_coaching_system():
        """Test the coaching system with sample data."""
        print("🚀 Testing OpenRouter Coaching System with LED Breadcrumbs")
        print("=" * 60)
        
        # Initialize system
        api_key = os.getenv('OPENROUTER_API_KEY', 'test-key')
        system = OpenRouterCoachingSystem(api_key)
        
        # Test connection
        connection_ok = await system.test_connection()
        print(f"✅ Connection test: {'PASSED' if connection_ok else 'FAILED'}")
        
        # Simulate conversation flow
        print("\n🎯 Simulating conversation with coaching prompts:")
        
        # Prospect asks a question
        prompt1 = system.process_transcription(
            "What's the pricing for your premium package?", 
            "prospect"
        )
        
        if prompt1:
            print(f"💡 Coaching Prompt: {prompt1.prompt_text}")
            print(f"   ⏱️  Generated in: {prompt1.generation_time_ms:.1f}ms")
            print(f"   🎯 Type: {prompt1.coaching_type}")
            print(f"   🚨 Urgency: {prompt1.urgency_level}/5")
        
        # User responds
        system.process_transcription(
            "Great question! Let me explain our pricing structure...", 
            "user"
        )
        
        # Prospect raises objection
        prompt2 = system.process_transcription(
            "That seems quite expensive compared to your competitors.", 
            "prospect"
        )
        
        if prompt2:
            print(f"\n💡 Coaching Prompt: {prompt2.prompt_text}")
            print(f"   ⏱️  Generated in: {prompt2.generation_time_ms:.1f}ms")
            print(f"   🎯 Type: {prompt2.coaching_type}")
            print(f"   🚨 Urgency: {prompt2.urgency_level}/5")
        
        # Print performance metrics
        metrics = system.get_performance_metrics()
        print(f"\n📊 Performance Metrics:")
        print(f"   Total Requests: {metrics['total_requests']}")
        print(f"   Success Rate: {metrics['success_rate']:.1f}%")
        print(f"   Avg Response Time: {metrics['average_response_time_ms']:.1f}ms")
        print(f"   Under Target Rate: {metrics['under_target_rate']:.1f}%")
        
        # Print AI breadcrumb summary
        print(f"\n🔍 LED Breadcrumb Summary:")
        trail_summary = system.trail.get_performance_summary()
        print(f"   Total Operations: {trail_summary['total_operations']}")
        print(f"   Success Rate: {trail_summary['success_rate']:.1f}%")
        
        # Cleanup
        await system.cleanup()
        print(f"\n✅ Coaching system test completed")
    
    # Run the test
    asyncio.run(test_coaching_system())