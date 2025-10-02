#!/usr/bin/env python3
"""
OpenRouter CLI Interface for VoiceCoach Tauri Integration
Provides command-line interface to OpenRouter client for Rust backend calls
"""

import sys
import json
import asyncio
import argparse
import logging
from typing import Dict, Any

from .openrouter_client import OpenRouterClient, CoachingContext, CoachingModel
from .conversation_analyzer import ConversationAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenRouterCLI:
    """CLI wrapper for OpenRouter client integration."""
    
    def __init__(self):
        self.client = None
        self.analyzer = ConversationAnalyzer()
    
    def initialize_client(self, api_key: str) -> bool:
        """Initialize OpenRouter client with API key."""
        try:
            self.client = OpenRouterClient(api_key)
            logger.info("OpenRouter client initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize OpenRouter client: {e}")
            return False
    
    async def generate_coaching_prompt(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate coaching prompt from request data."""
        if not self.client:
            raise Exception("OpenRouter client not initialized")
        
        # Extract request parameters
        context_data = request.get('context', {})
        model = request.get('model', 'openai/gpt-4-turbo')
        priority = request.get('priority', 'balanced')
        
        # Build coaching context
        context = CoachingContext(
            conversation_snippet=context_data.get('conversation_snippet', ''),
            sales_stage=context_data.get('sales_stage', 'discovery'),
            participant_roles=context_data.get('participant_roles', {}),
            call_duration_minutes=context_data.get('call_duration_minutes', 0),
            key_topics_discussed=context_data.get('key_topics_discussed', []),
            objections_detected=context_data.get('objections_detected', []),
            sentiment_analysis=context_data.get('sentiment_analysis'),
            company_context=context_data.get('company_context')
        )
        
        # Generate coaching prompt
        try:
            coaching_model = CoachingModel(model)
        except ValueError:
            coaching_model = CoachingModel.GPT_4_TURBO
        
        prompt = await self.client.generate_coaching_prompt(
            context=context,
            model=coaching_model,
            priority=priority
        )
        
        # Convert to dictionary for JSON serialization
        return {
            'primary_suggestion': prompt.primary_suggestion,
            'confidence_score': prompt.confidence_score,
            'prompt_type': prompt.prompt_type,
            'urgency_level': prompt.urgency_level,
            'supporting_evidence': prompt.supporting_evidence,
            'next_best_actions': prompt.next_best_actions,
            'knowledge_sources': prompt.knowledge_sources,
            'estimated_impact': prompt.estimated_impact,
            'implementation_difficulty': prompt.implementation_difficulty,
            'model_used': prompt.model_used,
            'response_time_ms': prompt.response_time_ms,
            'token_usage': prompt.token_usage
        }
    
    async def analyze_conversation(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze conversation for context and stage detection."""
        transcription_text = request.get('transcription_text', '')
        speaker = request.get('speaker', 'user')
        current_stage = request.get('current_stage', 'discovery')
        conversation_history = request.get('conversation_history', '')
        
        # Use conversation analyzer for fast local analysis
        conversation_id = request.get('conversation_id', 'default')
        
        context = self.analyzer.analyze_conversation_turn(
            conversation_id=conversation_id,
            speaker_id=speaker,
            content=transcription_text
        )
        
        # Convert to expected format
        return {
            'current_stage': context.current_stage.value,
            'confidence': 0.8,  # Analyzer confidence
            'key_topics': context.key_topics,
            'objections': context.detected_objections,
            'opportunities': context.buying_signals,
            'sentiment': context.sentiment_trend[-1][1].value if context.sentiment_trend else 'neutral',
            'talk_time_ratio': {
                'user': 50.0,  # Would need more sophisticated calculation
                'prospect': 50.0
            },
            'urgency_score': context.urgency_score
        }
    
    async def retrieve_knowledge(self, request: Dict[str, Any]) -> list:
        """Retrieve knowledge base information."""
        query = request.get('query', '')
        stage = request.get('stage', 'discovery')
        topics = request.get('topics', [])
        max_results = request.get('max_results', 3)
        
        # Mock knowledge base for now - would integrate with ChromaDB
        knowledge_items = [
            {
                'content': f"Contextual advice for {stage} stage: Focus on understanding their specific challenges.",
                'source': 'Sales Methodology Guide',
                'relevance': 0.9,
                'type': f'{stage.title()} Best Practice'
            },
            {
                'content': f"When discussing {', '.join(topics[:2]) if topics else 'general topics'}, tie benefits to their business impact.",
                'source': 'Product Training Materials',
                'relevance': 0.8,
                'type': 'Benefit Positioning'
            },
            {
                'content': 'Use open-ended questions to encourage prospect engagement and information sharing.',
                'source': 'Consultative Selling Guide',
                'relevance': 0.7,
                'type': 'Question Framework'
            }
        ]
        
        return knowledge_items[:max_results]
    
    async def process_request(self, request_data: str) -> str:
        """Process JSON request and return JSON response."""
        try:
            request = json.loads(request_data)
            api_key = request.get('api_key')
            action = request.get('action')
            
            # Initialize client if API key provided
            if api_key and not self.client:
                if not self.initialize_client(api_key):
                    raise Exception("Failed to initialize OpenRouter client")
            
            # Route request to appropriate handler
            if action == 'generate_coaching_prompt':
                result = await self.generate_coaching_prompt(request)
            elif action == 'analyze_conversation':
                result = await self.analyze_conversation(request)
            elif action == 'retrieve_knowledge':
                result = await self.retrieve_knowledge(request)
            else:
                raise Exception(f"Unknown action: {action}")
            
            return json.dumps(result)
            
        except Exception as e:
            logger.error(f"Request processing failed: {e}")
            error_response = {
                'error': str(e),
                'status': 'failed'
            }
            return json.dumps(error_response)

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description='OpenRouter CLI for VoiceCoach')
    parser.add_argument('--api-request', 
                       help='JSON request string for API processing')
    parser.add_argument('--test-mode', action='store_true',
                       help='Run in test mode with mock data')
    
    args = parser.parse_args()
    
    cli = OpenRouterCLI()
    
    if args.test_mode:
        # Test mode - demonstrate functionality
        test_request = {
            'action': 'generate_coaching_prompt',
            'api_key': 'test_key',
            'context': {
                'conversation_snippet': 'Prospect: I\'m interested but concerned about the cost.',
                'sales_stage': 'objection_handling',
                'call_duration_minutes': 15,
                'key_topics_discussed': ['pricing', 'value proposition'],
                'objections_detected': ['cost concern']
            },
            'model': 'openai/gpt-4-turbo',
            'priority': 'balanced'
        }
        
        async def run_test():
            result = await cli.process_request(json.dumps(test_request))
            print(result)
        
        asyncio.run(run_test())
        
    elif args.api_request:
        # Process actual API request
        async def run_request():
            result = await cli.process_request(args.api_request)
            print(result)
        
        asyncio.run(run_request())
        
    else:
        parser.print_help()

if __name__ == '__main__':
    main()