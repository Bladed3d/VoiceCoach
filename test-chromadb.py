#!/usr/bin/env python3
"""
Quick test script to verify ChromaDB is working with VoiceCoach V2 RAG documents
Run this to test ChromaDB indexing and search
"""

import sys
import os
import json
import time

# Add the correct path for the ChromaDB server module
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import directly since chromadb-server.py is in src/services/
exec(open(os.path.join(current_dir, 'src', 'services', 'chromadb-server.py')).read())

def test_chromadb():
    print("\n🎯 Testing ChromaDB with VoiceCoach V2 RAG Documents\n")
    
    # Initialize ChromaDB
    service = ChromaDBService()
    if not service.initialize():
        print("❌ Failed to initialize ChromaDB")
        return False
    
    print("✅ ChromaDB initialized\n")
    
    # Find a RAG document to test with
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
        print(f"❌ No RAG document found at {rag_path}")
        print("Please ensure you have processed documents in the rag/ folder")
        return False
    
    print(f"📄 Loading RAG document: {os.path.basename(rag_path)}")
    
    # Load the document into ChromaDB
    if not service.load_rag_document(rag_path):
        print("❌ Failed to load RAG document")
        return False
    
    print("✅ RAG document indexed successfully\n")
    
    # Get stats
    stats = service.get_stats()
    print(f"📊 Collection stats: {stats['document_count']} conversation paths indexed\n")
    
    # Test searches with common sales objections
    test_queries = [
        "This seems really expensive for what we need",
        "I need to think about it",
        "We're not ready to make a decision yet",
        "The competitor is cheaper",
        "I need to talk to my boss first"
    ]
    
    print("🔍 Testing semantic search with common objections:\n")
    
    for query in test_queries:
        print(f"Query: \"{query}\"")
        
        start_time = time.time()
        results = service.search(query, n_results=1)
        search_time = (time.time() - start_time) * 1000
        
        if results:
            result = results[0]
            print(f"✅ Match found (confidence: {result['confidence']:.2f}, time: {search_time:.0f}ms)")
            print(f"   Technique: {result['technique_name']}")
            print(f"   Response: \"{result['immediate_response']}\"")
            if result['next_move']:
                print(f"   Next Move: \"{result['next_move']}\"")
        else:
            print("❌ No match found")
        print()
    
    print("\n🎉 ChromaDB test complete! The system is ready for semantic search.\n")
    return True

if __name__ == "__main__":
    success = test_chromadb()
    sys.exit(0 if success else 1)