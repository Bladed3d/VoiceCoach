#!/bin/bash
echo "🚀 Starting Ollama with verbose timing output..."
echo "This will show timing for each request - useful for model performance comparison"
echo ""
echo "To compare models:"
echo "1. Run this script"
echo "2. Test with small model (e.g., llama3.2:3b)"
echo "3. Note response times in console"
echo "4. Switch to larger model (e.g., qwen2.5:14b-instruct-q4_k_m)"
echo "5. Compare timing differences"
echo ""
echo "Press Ctrl+C to stop Ollama"
echo ""
ollama serve --verbose