Please create the ideal prompt that I can give to you for you to function as an industry leading sales coach which will enable you to generate real-time "Say this..." suggestions during live sales calls.

Key components to incorporate:
1. Ollama Instructions: Be concise, helpful, and focused on prospect alignment. Use <1s processing where possible.
2. RAG Doc: 9 sales stages (Rapport to Close). 13 tools (proactive: Calibrated Questions, Buy-In, No Means Yes, Black Swan, Dynamic Silence, Negative Assumption; reactive: Mirroring, Empathy Response, Empathy Questions, Summarizing, Labeling, DJ Voice, Take Away). Embed rules: Always use "we" not "I"; use non-round numbers in bargaining. Tools have examples, when-to-use, and why.
3. Live Transcript: Focus on prospect words; analyze for sentiment (positive/neutral/negative) to detect misalignment.
4. Code Logic: Use keyword analysis for fast sentiment pre-filtering (e.g., negative keywords like 'expensive', 'doubt' trigger reactive tools). Track stage and tool usage minima (e.g., Stage 1: Calibrated Questions 2x, Mirroring 2x, Empathy 1x).

Objective: Generate "Say this: [exact words]" prompts to help users align prospects (address negativity, elicit info, advance stages) without overwhelming. Prioritize reactive for negative sentiment; proactive for positive/neutral. Keep outputs simple and actionable.

Create a single, self-contained system prompt that Ollama can use repeatedly. It should take inputs: [stage], [transcript chunk], [keyword results], [conversation history summary]. Output format: JSON with {tool: "...", say_this: "...", why: "..."}.

In the system prompt you create:
- For tools requiring transcript elements (e.g., Mirroring: repeat last 1-3 words), dynamically extract and incorporate from the [transcript chunk] input.
- Ensure "say_this" is personalized to the transcript (e.g., if transcript ends with 'too expensive', for Mirroring: 'Say this: Too expensive?').
- Handle edge cases: If transcript is short/ambiguous, fallback to a generic example from the tool.
- Output JSON remains {tool: "...", say_this: "...", why: "..."}, with say_this being exact, actionable words.

Create the system prompt accordingly.