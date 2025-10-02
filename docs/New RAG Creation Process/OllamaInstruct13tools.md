You are an AI data structurer. Your task is to convert the following Markdown document (listing 13 sales tools) into a clean JSON array of objects. Each tool should be an object with these keys:

\- "id": Integer starting from 1.

\- "name": Tool name.

\- "type": "proactive" or "reactive" based on the doc (or "rule" if applicable, but focus on the 13 active tools).

\- "description": Full description text.

\- "examples": Array of objects, each with "scenario" (if present), "prospect" (prospect's words if given), and "response" (exact response).

\- "why\_use": Why to use text.

\- "when\_use": When to use text.

\- "triggers": Array of inferred keywords/phrases from when/why (e.g., \['emotions rise', 'objections']—keep 3-5 max).

\- "uniqueness": Uniqueness note if present.



Be precise: Extract verbatim where possible, infer minimally for triggers. Output only the JSON array—no extra text.



Markdown Content:

\# Tools to Use to Align User with Prospect During Call





1\. \*\*Mirroring\*\*  

&nbsp;  Repeat the last 1-3 words of what the other person said to build rapport and encourage them to elaborate.  

&nbsp;  \*Example 1\*: During a customer service call where the client says, "This product isn't working as expected," respond with "Working as expected?" to draw out specific issues.  

&nbsp;  \*Example 2\*: In a family discussion, if a spouse says, "I'm tired of handling all the chores," mirror with "Handling all the chores?" to invite more details about their feelings.

&nbsp;  \*Why to Use\*: Enables you to learn more about them and dig deeper into their views.

&nbsp;  

2\. \*\*Empathy Response\*\*  

&nbsp;  Understand and articulate the other person’s emotions to influence outcomes and make them feel heard.  

&nbsp;  \*Example 1\*: In a vendor negotiation, say, "It must be challenging dealing with rising supply costs right now," to acknowledge their pressures and soften price discussions.  

&nbsp;  \*Example 2\*: When resolving a team conflict, express, "I understand how this change might feel overwhelming," to validate emotions and foster collaboration.

&nbsp;  \*When to Use\*: When you want to create emotional bonding. Or when emotions begin to rise and you want to guide them to be constructive. Or when you anticipate resistance or fear, this will soften emotions and let them feel heard.

&nbsp;  \*Uniqueness\*: Use this when you "know" their point of view. Use Summarizing when you are not sure or what to verify that you understand their view. 



3\. \*\*Empathy Questions\*\*  

&nbsp;  A Question that acknowledges their past efforts or success, yet opens the discussion to improvements.  

&nbsp;  \*Example 1\*: After hearing they spent 6 months creating their website say, "You brought a lot of great components together to create your website and it looks great. How would you envision your website gaining more sales conversions?"   

&nbsp;  \*Example 2\*: When resolving a team conflict, express, "I understand how this change might feel overwhelming," to validate emotions and foster collaboration.

&nbsp;  \*When to Use\*: When you want to create emotional bonding. Or when emotions begin to rise and you want to guide them to be constructive. Or when you anticipate resistance or fear, this will soften emotions and let them feel heard.

&nbsp;  \*Uniqueness\*: Use this when you "know" their point of view. Use Summarizing when you are not sure or what to verify that you understand their view.    



4\. \*\*Summarizing\*\*

&nbsp;  Rephrase what they said in your own words.

&nbsp;  \*Example 1\*: They say, "I spend more time wrestling with training and managing sales people. It is frustrating that they often just don't understand the emotional benefits of selling and always want to talk about technology and features. Some days I am tempted to just sell again." You say, "Sometimes it is tempting to go back to just selling yourself rather than wrestling with trying to train others who struggle to really understand the sales process."  

&nbsp;  \*Example 2\*: They say, "We spend more time in meetings talking about what we will do than we do actually doing it." You say, "Meetings about scheduling meetings... when do you get work done?"

&nbsp;  \*Why to Use\*: This verifies that you understood them. It confirms to them that they were heard. It creates alignment.



5\. \*\*Labeling\*\*  

&nbsp;  Name the emotions you observe to diffuse tension and validate feelings.  

&nbsp;  \*Example 1\*: If a boss appears hesitant about a proposal, say, "It seems like you're concerned about the risks involved," to address worries directly.  

&nbsp;  \*Example 2\*: In a parenting situation, if a child is angry, label with "It looks like you're really upset about having to clean your room", to calm the situation.



6\. \*\*Calibrated Questions - What or How\*\*  

&nbsp;  Ask open-ended questions starting with "how" or "what" to shift control and get the other party to solve your problems.  

&nbsp;  \*Example 1\*: In a real estate deal with a high asking price, ask, "What would make this property worth that amount to me?" to prompt the seller to highlight value.  

&nbsp;  \*Example 2\*: During a job interview salary talk, inquire, "How does the company determine fair compensation for this role?" to guide the conversation toward your favor.



7\. \*\*Negative Assumption\*\*  

&nbsp;  Address potential objections upfront by listing negative perceptions to disarm them and build trust.  

&nbsp;  \*Example 1\*: Before asking for a deadline extension, say, "You probably think I'm disorganized or not committed," to preempt pushback and gain empathy.  

&nbsp;  \*Example 2\*: In a sales pitch, start with "I know you might see this as too expensive or unnecessary," to clear the air and invite positive responses.



8\. \*\*Dynamic Silence = Extended Silence\*\*  

&nbsp;  Use pauses after speaking to encourage the other person to fill the silence with more information.  

&nbsp;  \*Example 1\*: After presenting a counteroffer in a business deal, pause silently to let the other party reveal their true bottom line.  

&nbsp;  \*Example 2\*: In a therapy session or deep conversation, ask a question about feelings and then stay quiet to allow the person to open up further.



9\. \*\*Black Swan = Hidden Fears, Concerns \& Needs\*\*  

&nbsp;  Uncover hidden issues, problems, and desires to reveal their true motivations or barriers. Odd or unexpected behavior can be a clue that a Black Swan exists.  

&nbsp;  \*Example 1\*: Deep into a discussion ask, "What haven't we addressed that would help you more?" Ask probing questions to discover a hidden regulatory issue, then leverage it for better terms.  

&nbsp;  \*Example 2\*: During a car purchase, dive into why they are selling to reveal they're moving soon, using that urgency to negotiate a discount.



10\. \*\*Buy-In\*\*  

&nbsp;  Ask permission before engaging, when you want to guide them to be teachable.  

&nbsp;  \*Example 1\*: Before presenting product benefits say, "Is it OK if I outline the 3 most popular ways customers use our app?"

&nbsp;  \*Example 2\*: A customer complains, "I can't get this product to work right!" Respond, "Is it OK if I walk you through 3 ways to get it to work better?"

&nbsp;  \*When to Use\*: When you want their focus, when you want them to be open to new ideas, or to shift their emotions to positive.



11\. \*\*DJ Voice = Deep Calm \& Slow\*\*  

&nbsp;  When emotions rise, concerns escalate, or their volume increases, counter with a deep, calm \& slower voice.  

&nbsp;  \*Example 1\*: Before presenting product benefits say, "Is it OK if I outline the 3 most popular ways customers use our app?"

&nbsp;  \*Example 2\*: A customer complains, "I can't get this product to work right!" Respond, "Is it OK if I walk you through 3 ways to get it to work better?"

&nbsp;  \*When to Use\*: When emotions rise and fears are building. De-escalate tension, reduce emotions, and bring calm to any situation.



12\. \*\*Truth is Found When "No" Means Yes\*\*  

&nbsp;  To get truthful answers, ask questions where the answer "No" is good.  

&nbsp;  \*Example 1\*: When calling a prospect, "Did I catch you at a bad time?" Their answer "No" means they can talk, but it makes it easy for them to admit they cannot talk when appropriate. They feel respected and their time valued.

&nbsp;  \*Example 2\*: Strategically offering a very low price for a corporate buyout, "We find a lot of value in your company but admittedly we have a smaller budget than I would like to have. Would you consider me a complete ass if I made you an offer for your company that is lower than you deserve, but opens up a discussion?" A "No" answer puts you in a great position to begin negotiations.

&nbsp;  \*When to Use\*: Head-off likely concerns or objections and get to truth by asking questions where no means yes.



13\. \*\*The Take Away - Turn Maybe into Don't Do It!\*\*  

&nbsp;  Agree with objections pushing them to the extreme, along side the prospect.  

&nbsp;  \*Example 1\*: When a prospect says, "I want to think about it." You respond, "Absolutely. In fact, if it isn't completely obvious that this will deliver everything and more than we discussed, you shouldn't do it! What makes you the most uncomfortable about moving forward?" And now you continue to unmask their true concerns.

&nbsp;  \*Example 2\*: When a prospect says, "I'm not sure if this is the right fit for our team." You respond: "I completely agree—if it doesn't perfectly align with your team's needs and goals, there's no point in forcing it; you shouldn't move forward at all. It could just create more headaches down the line. What specifically about the fit makes you question if it's ready for you?"

&nbsp;  \*When to Use\*: When objections arise. By agreeing with a prospect's objection, amplifying it to an extreme, and positioning yourself as an ally, you remove any pressure and make the prospect feel in control. The prospect often turns around to buy after the curtain to their charade is lifted.

