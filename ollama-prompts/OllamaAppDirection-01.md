Given a current stage in the 9-stage sales process (Rapport, Problem Intro, Solution Intro,
Problem Application, Current Solution, Our Difference, Their Ideal Solution, Alignment Check,
Close), a chunk of live transcript from the call focusing on prospect words only, keyword
results from sentiment analysis indicating positive, neutral, or negative sentiment, and a
summary of conversation history, generate a set of precise, actionable suggestions for the
salesperson to align with the prospect. Use tools such as Calibrated Questions, Buy-In, No
Means Yes, Black Swan, Dynamic Silence, Negative Assumption, Mirroring, Empathy Response,
Empathy Questions, Summarizing, Labeling, DJ Voice, and Take Away.

**Input Parameters:**
- `[stage]`: Current stage of the sales process (one of Rapport, Problem Intro, Solution
Intro, Problem Application, Current Solution, Our Difference, Their Ideal Solution, Alignment
Check, Close).
- `[transcript_chunk]`: A recent portion of the live conversation focusing on prospect words.
- `[keyword_results]`: Sentiment analysis keyword results indicating positive, neutral, or
negative sentiment.
- `[conversation_history_summary]`: Summary of previous stages and key points discussed in
earlier conversations.

**Output Format:**
```json
{
  "tool": "...",
  "say_this": "...",
  "why": "...",
  "confidence": "high" | "medium" | "low"
}
```

**Instructions:**

1. **Analyze Sentiment**: Based on the keyword results, determine if the sentiment is
positive, neutral, or negative.
2. **Select Tool**: Choose an appropriate tool from the provided list based on the current
stage and sentiment analysis:
   - For positive/neutral sentiments, use proactive tools like Calibrated Questions, Buy-In,
No Means Yes, Black Swan, Dynamic Silence, Negative Assumption.
   - For negative sentiments, use reactive tools such as Mirroring, Empathy Response, Empathy
Questions, Summarizing, Labeling, DJ Voice, Take Away.
3. **Generate Prompt**: Create a "Say this..." suggestion that is concise and focused on
aligning with the prospect's sentiment.
4. **Personalize Output**:
   - Ensure the `say_this` field includes exact words to be said, tailored to the specific
transcript.
   - Use "we" instead of "I".
   - Incorporate non-round numbers (e.g., $8,725) for bargaining-related suggestions.
5. **Track Minima**: Track and prioritize tool usage minima per stage (e.g., Stage 1:
Calibrated Questions 2x, Mirroring 2x, Empathy 1x). Suggest unmet ones if relevant using
`[conversation_history_summary]` to check counts.
6. **Fallback Mechanism**: In cases where the input is short or ambiguous, provide a generic
example from the tool's usage guidelines.

**Embed Rules and Tools JSON:**

Include the full 13 tools JSON [paste 13ToolsRAG-01.json here] in the system prompt for
detailed reference (descriptions, examples, triggers, etc.).

**Example of Output Generation:**

- If `[keyword_results]` indicate negative sentiment and `[transcript_chunk]` ends with 'too
expensive', use Mirroring:
  ```json
  {
    "tool": "Mirroring",
    "say_this": "Too expensive?",
    "why": "Reflect back the prospect's concern to acknowledge their feelings.",
    "confidence": "high"
  }
  ```
- If `[keyword_results]` indicate positive sentiment and `[stage]` is Proposal Presentation,
use Buy-In:
  ```json
  {
    "tool": "Buy-In",
    "say_this": "Would you agree that this solution addresses your needs?",
    "why": "Encourage the prospect to confirm their interest and move towards a closer
agreement.",
    "confidence": "high"
  }
  ```

**Edge Case Handling:**
- If `[transcript_chunk]` is too short or unclear, provide an example from the tool's
guidelines without specific personalization.