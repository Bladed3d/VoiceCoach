Task: design an Ollama or API process that monitors a live call and provides prompts to guide the user to make more sales.

Context source: we use Vosk to transcribe the live call with a focus on the prospect words

Sales progress tracking: There are 9 stages to a sale and the user selects the stage to guide our app to provide relevant prompts.

Sale Stages

1- Rapport
2- Problem Intro
3- Solution Intro
4- Problem application
5- Current solution
6- Our Difference
7- Their Ideal Solution
8- Alignment Check
9- Close

Sales Actions/Tools: We presently have 15 actions or tools a sales person can use during a call

Sales Tools:

1. **Mirroring**  
   Repeat the last 1-3 words of what the other person said to build rapport and encourage them to elaborate.  
   *Example 1*: During a customer service call where the client says, "This product isn't working as expected," respond with "Working as expected?" to draw out specific issues.  
   *Example 2*: In a family discussion, if a spouse says, "I'm tired of handling all the chores," mirror with "Handling all the chores?" to invite more details about their feelings.
   *Why to Use*: Enables you to learn more about them and dig deeper into their views.
   
2. **Empathy Response**  
   Understand and articulate the other person’s emotions to influence outcomes and make them feel heard.  
   *Example 1*: In a vendor negotiation, say, "It must be challenging dealing with rising supply costs right now," to acknowledge their pressures and soften price discussions.  
   *Example 2*: When resolving a team conflict, express, "I understand how this change might feel overwhelming," to validate emotions and foster collaboration.
   *When to Use*: When you want to create emotional bonding. Or when emotions begin to rise and you want to guide them to be constructive. Or when you anticipate resistance or fear, this will soften emotions and let them feel heard.
   *Uniqueness*: Use this when you "know" their point of view. Use Summarizing when you are not sure or what to verify that you understand their view. 

3. **Empathy Questions**  
   A Question that acknowledges their past efforts or success, yet opens the discussion to improvements.  
   *Example 1*: After hearing they spent 6 months creating their website say, "You brought a lot of great components together to create your website and it looks great. How would you envision your website gaining more sales conversions?"   
   *Example 2*: The prospect implies that they are increasing sales, "You have done a great job of growing your sales. How do you think the new technologies we have discusses will accelerate your success even further?" to validate past progress while emphasizing the opportunity for bigger gains.
   *When to Use*: When you want to create emotional bonding. Or when emotions begin to rise and you want to guide them to be constructive. Or when you anticipate resistance or fear, this will soften emotions and let them feel heard.
   *Uniqueness*: Use this when you "know" their point of view. Use Summarizing when you are not sure or what to verify that you understand their view.    

4. **Summarizing**
   Rephrase what they said in your own words.
   *Example 1*: They say, "I spend more time wrestling with training and managing sales people. It is frustrating that they often just don't understand the emotional benefits of selling and always want to talk about technology and features. Some days I am tempted to just sell again." You say, "Sometimes it is tempting to go back to just selling yourself rather than wrestling with trying to train others who struggle to really understand the sales process."  
   *Example 2*: They say, "We spend more time in meetings talking about what we will do than we do actually doing it." You say, "Meetings about scheduling meetings... when do you get work done?"
   *Why to Use*: This verifies that you understood them. It confirms to them that they were heard. It creates alignment.

5. **Labeling**  
   Name the emotions you observe to diffuse tension and validate feelings.  
   *Example 1*: If a boss appears hesitant about a proposal, say, "It seems like you're concerned about the risks involved," to address worries directly.  
   *Example 2*: In a parenting situation, if a child is angry, label with "It looks like you're really upset about having to clean your room", to calm the situation.

6. **Calibrated Questions - What or How**  
   Ask open-ended questions starting with "how" or "what" to shift control and get the other party to solve your problems.  
   *Example 1*: In a real estate deal with a high asking price, ask, "What would make this property worth that amount to me?" to prompt the seller to highlight value.  
   *Example 2*: During a job interview salary talk, inquire, "How does the company determine fair compensation for this role?" to guide the conversation toward your favor.

7. **Negative Assumption**  
   Address potential objections upfront by listing negative perceptions to disarm them and build trust.  
   *Example 1*: Before asking for a deadline extension, say, "You probably think I'm disorganized or not committed," to preempt pushback and gain empathy.  
   *Example 2*: In a sales pitch, start with "I know you might see this as too expensive or unnecessary," to clear the air and invite positive responses.

8. **Dynamic Silence = Extended Silence**  
   Use pauses after speaking to encourage the other person to fill the silence with more information.  
   *Example 1*: After presenting a counteroffer in a business deal, pause silently to let the other party reveal their true bottom line.  
   *Example 2*: In a therapy session or deep conversation, ask a question about feelings and then stay quiet to allow the person to open up further.

9. **Black Swan = Hidden Fears, Concerns & Needs**  
   Uncover hidden issues, problems, and desires to reveal their true motivations or barriers. Odd or unexpected behavior can be a clue that a Black Swan exists.  
   *Example 1*: Deep into a discussion ask, "What haven't we addressed that would help you more?" Ask probing questions to discover a hidden regulatory issue, then leverage it for better terms.  
   *Example 2*: During a car purchase, dive into why they are selling to reveal they're moving soon, using that urgency to negotiate a discount.

10. **Bargaining Techniques**  
   Use precise, non-round numbers in offers to anchor discussions and signal careful calculation.  
   *Example 1*: When buying a used car listed at $10,000, counter with $8,725 to imply detailed research and discourage easy rounding up.  
   *Example 2*: In freelance rate negotiations, propose $147.50 per hour instead of $150 to make the figure seem more precise and justified.

11. **Buy-In**  
   Ask permission before engaging, when you want to guide them to be teachable.  
   *Example 1*: Before presenting product benefits say, "Is it OK if I outline the 3 most popular ways customers use our app?"
   *Example 2*: A customer complains, "I can't get this product to work right!" Respond, "Is it OK if I walk you through 3 ways to get it to work better?"
   *When to Use*: When you want their focus, when you want them to be open to new ideas, or to shift their emotions to positive.

12. **DJ Voice = Deep Calm & Slow**  
   When emotions rise, concerns escalate, or their volume increases, counter with a deep, calm & slower voice.  
   *Example 1*: Before presenting product benefits say, "Is it OK if I outline the 3 most popular ways customers use our app?"
   *Example 2*: A customer complains, "I can't get this product to work right!" Respond, "Is it OK if I walk you through 3 ways to get it to work better?"
   *When to Use*: When emotions rise and fears are building. De-escalate tension, reduce emotions, and bring calm to any situation.

13. **"We" not "I"**  
   Set the stage during the intro and throughout discussion of "We" rather than "I" to work together to solve their problem.  
   *Example 1*: Customer says, "This is way too expensive!" Respond, "Well, if WE cannot identify a great ROI and obvious advantages, then WE won't do it." (Rather than saying "If I can't show you a great ROI...")
   *Example 2*: A customer complains, "This product is defective!" Respond, "How about if WE review the process for using it most effectively and WE find a solution you are happy with?"
   *When to Use*: From the intro through the whole discussion. Position yourself on the same side of the table with them, rather than on the opposite side of the table facing them.

14. **Truth is Found When "No" Means Yes**  
   To get truthful answers, ask questions where the answer "No" is good.  
   *Example 1*: When calling a prospect, "Did I catch you at a bad time?" Their answer "No" means they can talk, but it makes it easy for them to admit they cannot talk when appropriate. They feel respected and their time valued.
   *Example 2*: Strategically offering a very low price for a corporate buyout, "We find a lot of value in your company but admittedly we have a smaller budget than I would like to have. Would you consider me a complete ass if I made you an offer for your company that is lower than you deserve, but opens up a discussion?" A "No" answer puts you in a great position to begin negotiations.
   *When to Use*: Head-off likely concerns or objections and get to truth by asking questions where no means yes.

15. **The Take Away - Turn Maybe into Don't Do It!**  
   Agree with objections pushing them to the extreme, along side the prospect.  
   *Example 1*: When a prospect says, "I want to think about it." You respond, "Absolutely. In fact, if it isn't completely obvious that this will deliver everything and more than we discussed, you shouldn't do it! What makes you the most uncomfortable about moving forward?" And now you continue to unmask their true concerns.
   *Example 2*: When a prospect says, "I'm not sure if this is the right fit for our team." You respond: "I completely agree—if it doesn't perfectly align with your team's needs and goals, there's no point in forcing it; you shouldn't move forward at all. It could just create more headaches down the line. What specifically about the fit makes you question if it's ready for you?"
   *When to Use*: When objections arise. By agreeing with a prospect's objection, amplifying it to an extreme, and positioning yourself as an ally, you remove any pressure and make the prospect feel in control. The prospect often turns around to buy after the curtain to their charade is lifted.


As we design our live prompt strategies we can consider the following:

"We" not "I" is a rule, not a tool
Bargaining technique is a rule, not a tool

Calibrated Questions are proactive
Buy-In is proactive
No Means Yes is proactive
Black Swan is proactive
Dynamic Silence is proactive
Negative Assumption is proactive

Mirroring is reactive
Empathy is reactive
Labeling is reactive
DJ Voice is reactive
Take Away is reactive

Note:
"Proactive" means the sales person (user) uses this tool, speaking first, to elicit a response and gain further insights from the prospect.
"Reactive" means the user responds to something the prospect said using this tool.

Live analysis:

Presently, during a call we transcribe everything said with a focus on the words of the prospect.

We want to provide the best prompts in the form of "Say this...." to the user, recommending the best tool to use at that moment with the intention of 1) gaining information from the prospect, 2) analyzing the alignment of the prospect to the user (to a sale), 3) guide the user as to what to say to guide the prospect to better alignment.

By Stage 9 of the presentation, if the prospect is aligned with the user Mentally, Emotionally, Financially, and Schedule, then a sale will be the natural result.

Technical requirements: 
1) During a live call, prompts must be provided in <1s of transcription.
2) Our app should get smarter as the call progresses, identifying the pain points, concerns, and any non-alignment so we can guide the user to addressing them.
3) The app is being designed on a high-end i9, 128gb ram, 4090 computer running Ollama, but users must be able to run our app on a typical business desktop or laptop and we will provide ai access using an Openrouter API.

Our app presently has a RAG file selector where the RAG info is obtained. We have Ollama instructions file selection in settings. We have determined that ChromaDB is not as quick and efficient as storing data to ram, but are open to any tech, structure, and ideas for how to provide great prompts in real-time to our users.


