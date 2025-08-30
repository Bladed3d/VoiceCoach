# VoiceCoach V2: ChromaDB Document Processing Instructions

**Purpose:** Convert the NeverSplit document into semantic search chunks optimized for real-time coaching retrieval.

**Role:** You are a document chunking specialist preparing sales content for ChromaDB semantic search.

---

## **OVERVIEW**

ChromaDB will handle the "intelligence" through semantic search. Your job is simply to:
1. **Break the document into logical, searchable chunks**
2. **Ensure each chunk is self-contained and actionable**
3. **Optimize chunk size for semantic matching**

**No complex analysis needed** - ChromaDB's semantic search will find the right content automatically.

---

## **CHUNKING STRATEGY**

### **Chunk Size Guidelines:**
- **Target Size:** 200-400 characters per chunk
- **Maximum Size:** 512 characters (ChromaDB optimal)
- **Minimum Size:** 100 characters (ensure meaningful content)

### **Logical Boundaries:**
Break chunks at natural boundaries:
- ✅ End of complete thoughts/concepts
- ✅ End of techniques or strategies
- ✅ End of examples or scenarios
- ❌ Never break mid-sentence
- ❌ Never break mid-technique explanation

### **Self-Contained Chunks:**
Each chunk must be **independently useful:**
- Contains complete technique or concept
- Includes context (what situation it applies to)
- Can be understood without other chunks

---

## **PROCESSING STEPS**

### **Step 1: Identify Content Types**
As you read through the document, identify these content types:
- **Techniques:** Specific methods (mirroring, labeling, calibrated questions)
- **Strategies:** Broader approaches (tactical empathy, accusation audit)
- **Examples:** Real scenarios and applications
- **Principles:** Core concepts and rules
- **Scripts:** Exact phrases or questions to use

### **Step 2: Create Logical Chunks**
For each content type, create chunks that are:

**Technique Chunks:**
```
[TECHNIQUE NAME]: [Brief description]
When to use: [Situation/trigger]
How: [Implementation steps]
Example: "[Exact phrase or approach]"
```

**Strategy Chunks:**
```
[STRATEGY NAME]: [Purpose and benefit]
Application: [When and how to use]
Key elements: [Important components]
```

**Example/Script Chunks:**
```
Scenario: [Situation description]
Approach: [What to do]
Say this: "[Exact words to use]"
Why it works: [Brief explanation]
```

### **Step 3: Optimize for Search**
Ensure each chunk will be found by semantic search:
- **Include keywords** that customers might use
- **Include context words** that describe situations
- **Use natural language** (not just bullet points)
- **Add trigger phrases** that might come up in conversations

---

## **OUTPUT FORMAT**

Create a JSON file with this structure:

```json
{
  "document_info": {
    "source": "NeverSplitSummary_original.txt",
    "total_chunks": 150,
    "processed_date": "2025-08-30",
    "purpose": "ChromaDB semantic search for VoiceCoach V2"
  },
  "chunks": [
    {
      "id": "chunk_001",
      "content": "Mirroring technique: Repeat the last 1-3 words the other person said as a question. This builds rapport and encourages them to elaborate. When customer says 'This is expensive', you respond 'Expensive?' in a questioning tone. It shows you're listening and gets them talking more.",
      "content_type": "technique",
      "char_count": 285,
      "search_keywords": ["mirroring", "expensive", "rapport", "listening", "questioning"]
    },
    {
      "id": "chunk_002", 
      "content": "Tactical empathy means understanding the feelings and mindset of another person without necessarily agreeing with them. In sales, this helps you see the customer's perspective and address their real concerns, not just their stated objections.",
      "content_type": "principle",
      "char_count": 258,
      "search_keywords": ["tactical empathy", "feelings", "perspective", "concerns", "objections"]
    }
  ]
}
```

---

## **QUALITY CHECKLIST**

Before finishing, verify each chunk:
- ✅ **Complete thought:** Can be understood independently
- ✅ **Actionable:** Contains something the salesperson can DO
- ✅ **Searchable:** Uses natural language customers/salespeople use
- ✅ **Proper size:** 200-512 characters
- ✅ **Contextual:** Includes when/why/how information
- ✅ **Useful:** Would help in a real sales situation

---

## **EXPECTED OUTPUT**

From the 1800-line NeverSplit document, you should create:
- **~150-200 chunks** total
- **Mix of techniques, principles, examples, and scripts**
- **All optimized for semantic search retrieval**
- **Ready for ChromaDB import**

**Remember:** ChromaDB will do the intelligence work. Your job is just clean, logical chunking that makes the content easily findable and immediately useful for real-time coaching.

---

## **EXAMPLE USAGE**

When I provide you with the NeverSplit document, process it following these steps and output the JSON file. Focus on creating chunks that will help salespeople in real conversations - each chunk should be something they can immediately understand and apply.