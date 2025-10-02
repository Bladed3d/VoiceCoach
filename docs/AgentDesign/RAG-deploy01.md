The Stage-Based Predictive Engine



&nbsp; Core Discovery from the Analysis:



&nbsp; The V1 app's "predictive" nature wasn't magical AI - it was systematic stage progression

&nbsp; logic. The system:



&nbsp; 1. Detected current stage from conversation keywords

&nbsp; 2. Knew the next logical stage in the sales process

&nbsp; 3. Oriented prompts toward advancing to that next stage



&nbsp; Evidence from the Code:



&nbsp; // From old-Ollama-v2.md

&nbsp; const stageOrder: SalesStage\[] = \[

&nbsp;   'opening',           // → Goal: Move to discovery

&nbsp;   'discovery',         // → Goal: Move to presentation

&nbsp;   'presentation',      // → Goal: Move to objection handling

&nbsp;   'objection\_handling',// → Goal: Move to closing

&nbsp;   'closing',           // → Goal: Secure commitment

&nbsp;   'follow\_up'         // → Goal: Maintain relationship

&nbsp; ];



&nbsp; Each stage had pre-defined advancement strategies:



&nbsp; // Stage-specific prompts were essentially "next stage accelerators"

&nbsp; discovery: {

&nbsp;   focus: 'Uncover pain points and quantify impact',

&nbsp;   suggestions: \[

&nbsp;     'Ask: "What\\'s the biggest challenge you\\'re facing?"', // Opens door to presentation

&nbsp;     'Probe: "How is that impacting your revenue?"',         // Creates urgency for solution

&nbsp;     'Quantify: "What would solving this be worth?"'        // Sets up value discussion

&nbsp;   ]

&nbsp; }



&nbsp; The Simple But Powerful Formula:



&nbsp; Current Stage Detection + Next Stage Knowledge + Bridge Questions = "Predictive" Coaching



&nbsp; Why This Worked So Well:



&nbsp; 1. Sales conversations are predictable - They follow patterns

&nbsp; 2. Each stage has clear exit criteria - Specific information needed to advance

&nbsp; 3. Bridge questions are universal - Same transitions work across industries

&nbsp; 4. Context made it feel personalized - But the structure was consistent



&nbsp; The Real Implementation:



&nbsp; // The "predictive" magic was this simple

&nbsp; const generatePredictivePrompt = (currentStage, transcription) => {

&nbsp;   const nextStage = getNextStage(currentStage);

&nbsp;   const bridgeQuestions = getBridgeQuestions(currentStage, nextStage);



&nbsp;   // Find which bridge question fits the current context

&nbsp;   const relevantBridge = bridgeQuestions.find(q =>

&nbsp;     matchesCurrentTopic(q, transcription)

&nbsp;   );



&nbsp;   return {

&nbsp;     suggestion: relevantBridge.question,

&nbsp;     reasoning: `Move from ${currentStage} to ${nextStage}`,

&nbsp;     urgency: isStageStalled(currentStage) ? 'high' : 'medium'

&nbsp;   };

&nbsp; };



&nbsp; Supporting Technologies Were Secondary:



&nbsp; - Ollama's 8-layer prompts: Ensured quality formatting

&nbsp; - Knowledge base: Provided specific phrasing

&nbsp; - Context tracking: Made suggestions relevant

&nbsp; - UI/UX: Made it consumable



&nbsp; But the core predictive power came from knowing:

&nbsp; "We're in discovery, we need to move to presentation, so suggest questions that uncover enough

&nbsp;  pain to justify showing the solution"



&nbsp; Implications for V2:



&nbsp; Instead of complex AI reasoning, focus on:



&nbsp; 1. Robust stage detection (keyword scoring is sufficient)

&nbsp; 2. Clear stage progression maps (what info moves us forward?)

&nbsp; 3. Bridge question libraries (tested transitions)

&nbsp; 4. Context matching (which bridge fits current topic?)



&nbsp; The Simplicity is the Genius:



&nbsp; The V1 app was "predictive" because sales conversations are predictable. By tracking stages

&nbsp; and having ready-to-use bridges between them, it could always suggest the next logical step to

&nbsp;  advance the sale.



&nbsp; This is why users felt it was "reading their mind" - it was simply following the natural sales

&nbsp;  progression they were already trying to achieve!

