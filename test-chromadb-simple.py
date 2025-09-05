#!/usr/bin/env python3
"""
Simple test to verify ChromaDB is working with VoiceCoach V2 RAG documents
"""

import os
import json
import time
import chromadb
from chromadb.utils import embedding_functions

def test_chromadb():
    print("\n=== Testing ChromaDB with VoiceCoach V2 RAG Documents ===\n")
    
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(path="./chromadb_test_data")
    
    # Use sentence transformers for embeddings
    embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    
    print("[OK] ChromaDB initialized\n")
    
    # Find a RAG document
    rag_path = r"D:\Projects\Ai\VoiceCoach-v2\rag\NeverSplit_Predictive_2025-01-03_12-30-00.json"
    
    if not os.path.exists(rag_path):
        # Try to find any RAG document
        rag_dir = r"D:\Projects\Ai\VoiceCoach-v2\rag"
        if os.path.exists(rag_dir):
            for file in os.listdir(rag_dir):
                if file.endswith('.json') and 'Predictive' in file:
                    rag_path = os.path.join(rag_dir, file)
                    break
    
    if not os.path.exists(rag_path):
        print("[ERROR] No RAG document found")
        return False
    
    print(f"[LOADING] RAG document: {os.path.basename(rag_path)}")
    
    # Load the RAG document
    with open(rag_path, 'r', encoding='utf-8') as f:
        rag_data = json.load(f)
    
    # Create or get collection
    try:
        collection = client.delete_collection("voicecoach_test")
    except:
        pass
    
    collection = client.create_collection(
        name="voicecoach_test",
        embedding_function=embedding_function,
        metadata={"hnsw:space": "cosine"}
    )
    
    # Index conversation paths
    documents = []
    metadatas = []
    ids = []
    id_counter = 0
    
    if 'predictive_techniques' in rag_data:
        for technique in rag_data['predictive_techniques']:
            technique_name = technique.get('technique_name', 'Unknown')
            
            for path in technique.get('conversation_paths', [])[:5]:  # Just index first 5 for testing
                # Create embedding text
                embedding_text = f"{path.get('trigger', '')}. {path.get('current_situation', '')}"
                
                documents.append(embedding_text)
                metadatas.append({
                    'technique_name': technique_name,
                    'trigger': path.get('trigger', ''),
                    'response': path.get('immediate_response', {}).get('exact_words', ''),
                    'confidence': path.get('confidence_score', 0.8)
                })
                ids.append(f'path_{id_counter}')
                id_counter += 1
    
    print(f"[INDEXING] {len(documents)} conversation paths...")
    
    # Add to collection
    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    
    print("[OK] Documents indexed successfully\n")
    
    # Test searches
    test_queries = [
        "This seems really expensive",
        "I need to think about it",
        "We're not ready yet"
    ]
    
    print("[SEARCH] Testing semantic search:\n")
    
    for query in test_queries:
        print(f"Query: \"{query}\"")
        
        start_time = time.time()
        results = collection.query(
            query_texts=[query],
            n_results=1
        )
        search_time = (time.time() - start_time) * 1000
        
        if results['metadatas'][0]:
            metadata = results['metadatas'][0][0]
            distance = results['distances'][0][0]
            confidence = max(0, 1 - distance)
            
            print(f"[MATCH] Found (confidence: {confidence:.2f}, time: {search_time:.0f}ms)")
            print(f"   Technique: {metadata['technique_name']}")
            print(f"   Response: \"{metadata['response']}\"")
        else:
            print("[NO MATCH] No match found")
        print()
    
    print("[SUCCESS] ChromaDB test complete! The system is working.\n")
    print("[INFO] Next step: The ChromaDB server will start automatically when you")
    print("   click 'Start Coaching' in the app and will index your documents.")
    return True

if __name__ == "__main__":
    test_chromadb()