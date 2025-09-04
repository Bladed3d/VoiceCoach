#!/usr/bin/env python3
"""
VoiceCoach V2 - ChromaDB Semantic Search Server
LED Range: 6500-6599 for ChromaDB operations
Provides fast semantic search for coaching suggestions
"""

import asyncio
import websockets
import json
import sys
import os
import logging
import traceback
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np

# ChromaDB imports
try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("[6500] WARNING: ChromaDB not installed. Install with: pip install chromadb")

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')
logger = logging.getLogger(__name__)

class LEDBreadcrumb:
    """LED Breadcrumb system for debugging ChromaDB operations"""
    
    @staticmethod
    def light(code: int, data: Dict = None):
        """Light up an LED with optional data"""
        timestamp = datetime.now().isoformat()
        message = f"[{code}] {json.dumps(data) if data else 'Operation'}"
        print(message, flush=True)
        logger.info(message)
        
    @staticmethod
    def fail(code: int, error: Exception):
        """Log a failure with LED code"""
        timestamp = datetime.now().isoformat()
        message = f"[{code}] ERROR: {str(error)}\n{traceback.format_exc()}"
        print(message, flush=True, file=sys.stderr)
        logger.error(message)

class ChromaDBService:
    """ChromaDB service for semantic search of coaching techniques"""
    
    def __init__(self, persist_directory: str = "./chromadb_data"):
        self.trail = LEDBreadcrumb()
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.embedding_function = None
        self.is_initialized = False
        
        # LED 6501: Service initialization
        self.trail.light(6501, {
            "operation": "chromadb_service_init",
            "persist_dir": persist_directory,
            "chromadb_available": CHROMADB_AVAILABLE
        })
        
    def initialize(self) -> bool:
        """Initialize ChromaDB client and collection"""
        try:
            if not CHROMADB_AVAILABLE:
                self.trail.light(6502, {"error": "ChromaDB not installed"})
                return False
                
            # LED 6503: Creating ChromaDB client
            self.trail.light(6503, {"operation": "creating_client"})
            
            # Create persistent client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Use sentence transformers for embeddings (fast and good quality)
            self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"  # Fast, lightweight model
            )
            
            # LED 6504: Client created successfully
            self.trail.light(6504, {
                "operation": "client_created",
                "embedding_model": "all-MiniLM-L6-v2"
            })
            
            self.is_initialized = True
            return True
            
        except Exception as e:
            self.trail.fail(8501, e)
            return False
    
    def load_rag_document(self, document_path: str) -> bool:
        """Load and index a RAG document into ChromaDB"""
        try:
            # LED 6510: Loading RAG document
            self.trail.light(6510, {
                "operation": "loading_rag_document",
                "path": document_path
            })
            
            # Read the RAG document
            with open(document_path, 'r', encoding='utf-8') as f:
                rag_data = json.load(f)
            
            # Extract collection name from filename
            collection_name = os.path.basename(document_path).replace('.json', '').lower()
            collection_name = ''.join(c if c.isalnum() or c == '_' else '_' for c in collection_name)
            
            # LED 6511: Creating/getting collection
            self.trail.light(6511, {
                "operation": "creating_collection",
                "name": collection_name
            })
            
            # Delete existing collection if it exists (for clean reindexing)
            try:
                self.client.delete_collection(collection_name)
            except:
                pass  # Collection doesn't exist yet
            
            # Create new collection
            self.collection = self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function,
                metadata={"hnsw:space": "cosine"}
            )
            
            # Prepare documents for indexing
            documents = []
            metadatas = []
            ids = []
            
            # LED 6512: Processing predictive techniques
            self.trail.light(6512, {
                "operation": "processing_techniques",
                "technique_count": len(rag_data.get('predictive_techniques', []))
            })
            
            # Index predictive techniques
            id_counter = 0
            if 'predictive_techniques' in rag_data:
                for technique in rag_data['predictive_techniques']:
                    technique_name = technique.get('technique_name', 'Unknown')
                    
                    for path in technique.get('conversation_paths', []):
                        # Create rich embedding text
                        embedding_parts = [
                            path.get('trigger', ''),
                            path.get('current_situation', ''),
                            path.get('immediate_response', {}).get('strategy', ''),
                            path.get('predicted_path', {}).get('likely_prospect_response', ''),
                            path.get('predicted_path', {}).get('next_move', {}).get('why', '')
                        ]
                        embedding_text = '. '.join(filter(None, embedding_parts))
                        
                        # Add main path
                        documents.append(embedding_text)
                        metadatas.append({
                            'technique_name': technique_name,
                            'trigger': path.get('trigger', ''),
                            'immediate_response': path.get('immediate_response', {}).get('exact_words', ''),
                            'tone': path.get('immediate_response', {}).get('tone', ''),
                            'next_move': path.get('predicted_path', {}).get('next_move', {}).get('exact_words', ''),
                            'next_strategy': path.get('predicted_path', {}).get('next_move', {}).get('strategy', ''),
                            'third_move': path.get('predicted_path', {}).get('third_move', {}).get('exact_words', ''),
                            'expected_outcome': path.get('predicted_path', {}).get('third_move', {}).get('expected_outcome', ''),
                            'confidence_score': path.get('confidence_score', 0.8),
                            'current_situation': path.get('current_situation', ''),
                            'path_type': 'main'
                        })
                        ids.append(f'path_{id_counter}')
                        id_counter += 1
                        
                        # Index alternative paths separately for better coverage
                        for alt_path in path.get('alternative_paths', []):
                            alt_embedding = f"{alt_path.get('if_they_say', '')}. {alt_path.get('leads_to', '')}"
                            documents.append(alt_embedding)
                            metadatas.append({
                                'technique_name': technique_name,
                                'trigger': alt_path.get('if_they_say', ''),
                                'immediate_response': alt_path.get('then_say', ''),
                                'expected_outcome': alt_path.get('leads_to', ''),
                                'confidence_score': path.get('confidence_score', 0.7),
                                'path_type': 'alternative'
                            })
                            ids.append(f'alt_{id_counter}')
                            id_counter += 1
            
            # LED 6513: Adding documents to ChromaDB
            self.trail.light(6513, {
                "operation": "indexing_documents",
                "document_count": len(documents)
            })
            
            # Add all documents to collection
            if documents:
                self.collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                
                # LED 6514: Indexing complete
                self.trail.light(6514, {
                    "operation": "indexing_complete",
                    "total_paths": len(documents),
                    "collection": collection_name
                })
                return True
            else:
                self.trail.light(6515, {"warning": "No documents to index"})
                return False
                
        except Exception as e:
            self.trail.fail(8510, e)
            return False
    
    def search(self, query: str, n_results: int = 3) -> List[Dict]:
        """Search for relevant coaching techniques"""
        try:
            if not self.collection:
                self.trail.light(6520, {"error": "No collection loaded"})
                return []
            
            # LED 6521: Performing search
            start_time = time.time()
            self.trail.light(6521, {
                "operation": "searching",
                "query_length": len(query),
                "n_results": n_results
            })
            
            # Query the collection
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            search_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # LED 6522: Search complete
            self.trail.light(6522, {
                "operation": "search_complete",
                "results_found": len(results['ids'][0]) if results['ids'] else 0,
                "search_time_ms": round(search_time, 2)
            })
            
            # Format results
            formatted_results = []
            if results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i]
                    
                    # Convert distance to confidence (0 = perfect match)
                    confidence = max(0, 1 - distance) * metadata.get('confidence_score', 1.0)
                    
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'confidence': confidence,
                        'technique_name': metadata.get('technique_name', ''),
                        'trigger': metadata.get('trigger', ''),
                        'immediate_response': metadata.get('immediate_response', ''),
                        'tone': metadata.get('tone', ''),
                        'next_move': metadata.get('next_move', ''),
                        'next_strategy': metadata.get('next_strategy', ''),
                        'third_move': metadata.get('third_move', ''),
                        'expected_outcome': metadata.get('expected_outcome', ''),
                        'current_situation': metadata.get('current_situation', ''),
                        'path_type': metadata.get('path_type', 'main')
                    })
            
            # LED 6523: Returning formatted results
            self.trail.light(6523, {
                "operation": "results_formatted",
                "count": len(formatted_results),
                "top_confidence": formatted_results[0]['confidence'] if formatted_results else 0
            })
            
            return formatted_results
            
        except Exception as e:
            self.trail.fail(8520, e)
            return []
    
    def get_stats(self) -> Dict:
        """Get statistics about the current collection"""
        try:
            if not self.collection:
                return {"status": "No collection loaded"}
            
            count = self.collection.count()
            
            return {
                "status": "ready",
                "collection_name": self.collection.name,
                "document_count": count,
                "embedding_model": "all-MiniLM-L6-v2",
                "persist_directory": self.persist_directory
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

class ChromaDBWebSocketServer:
    """WebSocket server for ChromaDB operations"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 8767):
        self.host = host
        self.port = port
        self.chromadb_service = ChromaDBService()
        self.trail = LEDBreadcrumb()
        self.clients = set()
        
    async def handle_client(self, websocket, path):
        """Handle WebSocket client connections"""
        self.clients.add(websocket)
        
        # LED 6530: Client connected
        self.trail.light(6530, {
            "operation": "client_connected",
            "client_count": len(self.clients)
        })
        
        try:
            async for message in websocket:
                try:
                    # Parse the message
                    data = json.loads(message)
                    command = data.get('command', '')
                    
                    # LED 6531: Processing command
                    self.trail.light(6531, {
                        "operation": "processing_command",
                        "command": command
                    })
                    
                    response = await self.process_command(command, data)
                    
                    # Send response
                    await websocket.send(json.dumps(response))
                    
                except json.JSONDecodeError as e:
                    error_response = {
                        "status": "error",
                        "error": f"Invalid JSON: {str(e)}",
                        "led": 8530
                    }
                    await websocket.send(json.dumps(error_response))
                    
                except Exception as e:
                    self.trail.fail(8531, e)
                    error_response = {
                        "status": "error",
                        "error": str(e),
                        "led": 8531
                    }
                    await websocket.send(json.dumps(error_response))
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            # LED 6532: Client disconnected
            self.trail.light(6532, {
                "operation": "client_disconnected",
                "client_count": len(self.clients)
            })
    
    async def process_command(self, command: str, data: Dict) -> Dict:
        """Process ChromaDB commands"""
        
        if command == "initialize":
            # LED 6540: Initialize ChromaDB
            self.trail.light(6540, {"operation": "initialize_command"})
            success = self.chromadb_service.initialize()
            return {
                "status": "success" if success else "error",
                "initialized": success,
                "led": 6540
            }
        
        elif command == "load_document":
            # LED 6541: Load RAG document
            document_path = data.get('path', '')
            self.trail.light(6541, {
                "operation": "load_document_command",
                "path": document_path
            })
            
            if not os.path.exists(document_path):
                return {
                    "status": "error",
                    "error": f"Document not found: {document_path}",
                    "led": 8541
                }
            
            success = self.chromadb_service.load_rag_document(document_path)
            return {
                "status": "success" if success else "error",
                "loaded": success,
                "led": 6541
            }
        
        elif command == "search":
            # LED 6542: Search for coaching suggestions
            query = data.get('query', '')
            n_results = data.get('n_results', 3)
            
            self.trail.light(6542, {
                "operation": "search_command",
                "query_length": len(query),
                "n_results": n_results
            })
            
            results = self.chromadb_service.search(query, n_results)
            return {
                "status": "success",
                "results": results,
                "led": 6542
            }
        
        elif command == "get_stats":
            # LED 6543: Get statistics
            self.trail.light(6543, {"operation": "get_stats_command"})
            stats = self.chromadb_service.get_stats()
            return {
                "status": "success",
                "stats": stats,
                "led": 6543
            }
        
        elif command == "ping":
            # LED 6544: Ping/health check
            return {
                "status": "success",
                "message": "ChromaDB server is running",
                "chromadb_available": CHROMADB_AVAILABLE,
                "led": 6544
            }
        
        else:
            return {
                "status": "error",
                "error": f"Unknown command: {command}",
                "led": 8540
            }
    
    async def start(self):
        """Start the WebSocket server"""
        # LED 6500: Starting ChromaDB server
        self.trail.light(6500, {
            "operation": "server_starting",
            "host": self.host,
            "port": self.port,
            "chromadb_available": CHROMADB_AVAILABLE
        })
        
        # Initialize ChromaDB on startup
        if CHROMADB_AVAILABLE:
            self.chromadb_service.initialize()
        
        # Start WebSocket server
        async with websockets.serve(self.handle_client, self.host, self.port):
            print(f"[6500] ChromaDB WebSocket server running on ws://{self.host}:{self.port}")
            print(f"[6500] ChromaDB Available: {CHROMADB_AVAILABLE}")
            if not CHROMADB_AVAILABLE:
                print("[6500] Install ChromaDB with: pip install chromadb")
            
            # Keep server running
            await asyncio.Future()

def main():
    """Main entry point"""
    # Parse command line arguments
    host = "127.0.0.1"
    port = 8767
    
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    if len(sys.argv) > 2:
        host = sys.argv[2]
    
    # Create and start server
    server = ChromaDBWebSocketServer(host, port)
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\n[6599] ChromaDB server shutting down...")
    except Exception as e:
        print(f"[8599] Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()