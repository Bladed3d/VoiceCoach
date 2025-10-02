#!/usr/bin/env python3
"""
VoiceCoach Knowledge Integration Module

This module provides the main integration point between the VoiceCoach Tauri application
and the document processing pipeline. It handles command-line arguments and provides
JSON-formatted responses for seamless Rust-Python communication.

Features:
- Command-line interface for Tauri integration
- Document processing with batch operations
- Knowledge base search and validation
- Real-time coaching suggestions
- LED breadcrumb system integration
- Proper error handling and JSON responses
"""

import sys
import json
import argparse
import traceback
import asyncio
import time
from pathlib import Path
from typing import Dict, List, Any, Optional

# Import document processing components
try:
    from document_processing.batch_processor import BatchProcessor, BatchProcessingConfig
    from document_processing.vector_storage import ChromaDBIntegration
    from chroma_rag_system import ChromaRAGSystem, KnowledgeSnippet
    from breadcrumb_system import BreadcrumbTrail
except ImportError as e:
    print(f"Error importing document processing components: {e}", file=sys.stderr)
    sys.exit(1)

class VoiceCoachKnowledgeManager:
    """Main knowledge management interface for VoiceCoach integration"""
    
    def __init__(self):
        self.trail = BreadcrumbTrail('VoiceCoachKnowledgeManager')
        self.rag_system = None
        self.batch_processor = None
        
        # LED 200: Initialize knowledge manager
        self.trail.light(200, {
            'operation': 'knowledge_manager_init',
            'timestamp': time.time()
        })
        
        self._initialize_systems()
    
    def _initialize_systems(self):
        """Initialize RAG and batch processing systems"""
        try:
            # LED 201: Initialize RAG system
            self.trail.light(201, {'operation': 'rag_system_init'})
            
            self.rag_system = ChromaRAGSystem(
                collection_name="voicecoach_sales_knowledge",
                persist_directory="./voicecoach_chromadb"
            )
            
            # LED 202: Initialize batch processor
            self.trail.light(202, {'operation': 'batch_processor_init'})
            
            config = BatchProcessingConfig(
                collection_name="voicecoach_sales_knowledge",
                persist_directory="./voicecoach_chromadb",
                chunking_strategy="semantic",
                max_workers=4
            )
            
            self.batch_processor = BatchProcessor(config)
            
            # LED 203: Initialization complete
            self.trail.light(203, {
                'operation': 'initialization_complete',
                'rag_initialized': self.rag_system is not None,
                'batch_processor_initialized': self.batch_processor is not None
            })
            
        except Exception as e:
            # LED 200: Initialization failed
            self.trail.fail(200, e)
            raise
    
    def process_directory(self, directory_path: str, recursive: bool = True) -> Dict[str, Any]:
        """Process documents from a directory"""
        try:
            # LED 210: Start directory processing
            self.trail.light(210, {
                'operation': 'process_directory_start',
                'directory_path': directory_path,
                'recursive': recursive
            })
            
            start_time = time.time()
            
            # Process documents
            stats = self.batch_processor.process_directory(
                Path(directory_path),
                recursive=recursive
            )
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            result = {
                'total_documents': stats.total_documents,
                'total_chunks': stats.total_chunks,
                'processing_time_ms': processing_time_ms,
                'success_rate': stats.success_rate,
                'knowledge_base_size': stats.knowledge_base_size
            }
            
            # LED 211: Directory processing complete
            self.trail.light(211, {
                'operation': 'process_directory_complete',
                'result': result
            })
            
            return result
            
        except Exception as e:
            # LED 210: Directory processing failed
            self.trail.fail(210, e)
            raise
    
    def search_knowledge(self, query: str, max_results: int = 5, sales_stage: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search the knowledge base"""
        try:
            # LED 220: Start knowledge search
            self.trail.light(220, {
                'operation': 'search_knowledge_start',
                'query': query[:100],  # Truncate for logging
                'max_results': max_results,
                'sales_stage': sales_stage
            })
            
            # Search knowledge base
            context = {'stage': sales_stage} if sales_stage else {}
            snippets = self.rag_system.search_knowledge(
                query=query,
                n_results=max_results,
                context=context
            )
            
            # Convert to serializable format
            results = []
            for snippet in snippets:
                result = {
                    'content': snippet.content,
                    'similarity_score': snippet.similarity_score,
                    'source_document': snippet.source_file,
                    'metadata': snippet.metadata
                }
                results.append(result)
            
            # LED 221: Knowledge search complete
            self.trail.light(221, {
                'operation': 'search_knowledge_complete',
                'results_count': len(results)
            })
            
            return results
            
        except Exception as e:
            # LED 220: Knowledge search failed
            self.trail.fail(220, e)
            raise
    
    def get_coaching_suggestions(self, conversation_context: str, sales_stage: str) -> List[Dict[str, Any]]:
        """Generate coaching suggestions based on conversation context"""
        try:
            # LED 230: Start coaching suggestions
            self.trail.light(230, {
                'operation': 'coaching_suggestions_start',
                'context_length': len(conversation_context),
                'sales_stage': sales_stage
            })
            
            # Search for relevant knowledge
            knowledge_results = self.search_knowledge(
                query=conversation_context,
                max_results=3,
                sales_stage=sales_stage
            )
            
            # Generate coaching suggestions
            suggestions = []
            for i, result in enumerate(knowledge_results):
                suggestion_type = self._determine_suggestion_type(result, sales_stage)
                
                suggestion = {
                    'suggestion_type': suggestion_type,
                    'confidence': result['similarity_score'],
                    'content': self._format_coaching_content(result['content'], suggestion_type),
                    'source_document': result['source_document'],
                    'methodology': result['metadata'].get('sales_methodology', 'General')
                }
                suggestions.append(suggestion)
            
            # LED 231: Coaching suggestions complete
            self.trail.light(231, {
                'operation': 'coaching_suggestions_complete',
                'suggestions_count': len(suggestions)
            })
            
            return suggestions
            
        except Exception as e:
            # LED 230: Coaching suggestions failed
            self.trail.fail(230, e)
            raise
    
    def _determine_suggestion_type(self, result: Dict[str, Any], sales_stage: str) -> str:
        """Determine the type of coaching suggestion"""
        content = result['content'].lower()
        
        if 'objection' in content or 'concern' in content:
            return 'objection_handling'
        elif 'closing' in content or 'close' in content:
            return 'closing_technique'
        elif 'discovery' in content or 'question' in content:
            return 'discovery_question'
        elif 'value' in content or 'benefit' in content:
            return 'value_proposition'
        else:
            return f'{sales_stage}_guidance'
    
    def _format_coaching_content(self, content: str, suggestion_type: str) -> str:
        """Format content for coaching display"""
        # Truncate content to reasonable length
        if len(content) > 200:
            content = content[:197] + "..."
        
        # Add coaching context based on type
        prefixes = {
            'objection_handling': '🛡️ Objection Response: ',
            'closing_technique': '🎯 Closing Approach: ',
            'discovery_question': '❓ Discovery Insight: ',
            'value_proposition': '💎 Value Message: ',
        }
        
        prefix = prefixes.get(suggestion_type, '💡 Coaching Tip: ')
        return f"{prefix}{content}"
    
    def validate_knowledge_base(self) -> Dict[str, Any]:
        """Validate the knowledge base integrity"""
        try:
            # LED 240: Start validation
            self.trail.light(240, {'operation': 'validate_knowledge_base_start'})
            
            # Perform validation
            validation_result = {
                'is_valid': True,
                'errors': [],
                'warnings': [],
                'collection_stats': {}
            }
            
            # Check if collection exists and has documents
            try:
                stats = self.rag_system.get_collection_stats()
                validation_result['collection_stats'] = stats
                
                if stats.get('total_documents', 0) == 0:
                    validation_result['warnings'].append("Knowledge base is empty")
                
            except Exception as e:
                validation_result['is_valid'] = False
                validation_result['errors'].append(f"Collection access failed: {str(e)}")
            
            # LED 241: Validation complete
            self.trail.light(241, {
                'operation': 'validate_knowledge_base_complete',
                'is_valid': validation_result['is_valid'],
                'errors_count': len(validation_result['errors'])
            })
            
            return validation_result
            
        except Exception as e:
            # LED 240: Validation failed
            self.trail.fail(240, e)
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        try:
            # LED 250: Start stats retrieval
            self.trail.light(250, {'operation': 'get_stats_start'})
            
            stats = self.rag_system.get_collection_stats()
            
            result = {
                'total_documents': stats.get('total_documents', 0),
                'total_chunks': stats.get('total_embeddings', 0),
                'collection_size': stats.get('collection_size', 0),
                'last_updated': stats.get('last_updated', 'Unknown'),
                'health_status': 'healthy' if stats.get('total_documents', 0) > 0 else 'warning'
            }
            
            # LED 251: Stats retrieval complete
            self.trail.light(251, {
                'operation': 'get_stats_complete',
                'stats': result
            })
            
            return result
            
        except Exception as e:
            # LED 250: Stats retrieval failed
            self.trail.fail(250, e)
            return {
                'total_documents': 0,
                'total_chunks': 0,
                'collection_size': 0,
                'last_updated': 'Error',
                'health_status': 'error'
            }

def main():
    """Main CLI interface for Tauri integration"""
    parser = argparse.ArgumentParser(description='VoiceCoach Knowledge Integration')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Process directory command
    process_parser = subparsers.add_parser('process-directory', help='Process documents from directory')
    process_parser.add_argument('directory', help='Directory path to process')
    process_parser.add_argument('--recursive', action='store_true', help='Process recursively')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search knowledge base')
    search_parser.add_argument('--query', required=True, help='Search query')
    search_parser.add_argument('--max-results', type=int, default=5, help='Maximum results')
    search_parser.add_argument('--sales-stage', help='Sales stage context')
    
    # Coaching command
    coaching_parser = subparsers.add_parser('get-coaching', help='Get coaching suggestions')
    coaching_parser.add_argument('--context', required=True, help='Conversation context')
    coaching_parser.add_argument('--stage', required=True, help='Sales stage')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate knowledge base')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Get knowledge base statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        manager = VoiceCoachKnowledgeManager()
        
        if args.command == 'process-directory':
            result = manager.process_directory(args.directory, args.recursive)
            print(json.dumps(result, indent=2))
            
        elif args.command == 'search':
            results = manager.search_knowledge(
                args.query, 
                args.max_results, 
                args.sales_stage
            )
            print(json.dumps(results, indent=2))
            
        elif args.command == 'get-coaching':
            suggestions = manager.get_coaching_suggestions(args.context, args.stage)
            print(json.dumps(suggestions, indent=2))
            
        elif args.command == 'validate':
            validation = manager.validate_knowledge_base()
            print(json.dumps(validation, indent=2))
            
        elif args.command == 'stats':
            stats = manager.get_stats()
            print(json.dumps(stats, indent=2))
            
    except Exception as e:
        error_response = {
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_response, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()