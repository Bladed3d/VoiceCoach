"""
Sample Sales Knowledge Data for VoiceCoach Testing
Creates realistic sales materials for demonstrating RAG system capabilities
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, List


def create_sample_sales_materials(output_dir: str = None) -> str:
    """
    Create sample sales materials for testing the RAG system.
    
    Args:
        output_dir: Directory to save sample files, uses temp dir if None
    
    Returns:
        Path to directory containing sample materials
    """
    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="voicecoach_samples_")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create sample documents
    sample_documents = {
        "objection_handlers.txt": OBJECTION_HANDLERS,
        "pricing_guide.txt": PRICING_GUIDE,
        "product_features.txt": PRODUCT_FEATURES,
        "sales_methodology.txt": SALES_METHODOLOGY,
        "case_studies.txt": CASE_STUDIES,
        "competitor_comparison.txt": COMPETITOR_COMPARISON,
        "discovery_questions.txt": DISCOVERY_QUESTIONS,
        "closing_techniques.txt": CLOSING_TECHNIQUES
    }
    
    # Write all sample documents
    for filename, content in sample_documents.items():
        file_path = output_path / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content.strip())
    
    print(f"Created {len(sample_documents)} sample sales documents in: {output_path}")
    return str(output_path)


# Sample Content for Sales Materials

OBJECTION_HANDLERS = """
# Common Sales Objections and Responses

## Price Objections

### "It's too expensive"
**Response Framework:**
1. Acknowledge: "I understand price is an important consideration."
2. Isolate: "If we could work out the investment, would you move forward?"
3. Value: "Let's look at the ROI you'll see in the first 90 days..."

**Key Points:**
- Focus on value, not cost
- Break down monthly/daily cost
- Compare to cost of not solving the problem
- Provide payment options

### "We don't have budget right now"
**Response:**
"I appreciate you being upfront about budget constraints. Most of our best clients initially had budget concerns too. What I've found is that when executives see the true cost of not addressing this problem, they often find ways to make the investment work. Can we explore what it's currently costing you to not have this solution?"

**Follow-up Questions:**
- What's your current process costing in time/resources?
- When do budgets typically get reviewed?
- What would need to happen for this to become a priority?

## Authority Objections

### "I need to talk to my boss/team"
**Response:**
"Absolutely, this is clearly an important decision that affects the whole team. To help you present this effectively to [boss/team], what specific concerns do you think they'll have? Let's make sure you have all the information they'll need to make a confident decision."

**Action Items:**
- Offer to join the discussion
- Provide executive summary materials
- Schedule follow-up within 48 hours

## Timing Objections

### "Now isn't the right time"
**Response:**
"I understand timing is crucial. Help me understand - what would need to change for this to become the right time? Often our most successful implementations happen when companies proactively address these challenges before they become critical."

**Probing Questions:**
- What's driving the current timing concern?
- What happens if you wait another 6 months?
- How long does your typical buying process take?

## Need Objections

### "We already have a solution"
**Response:**
"That's great that you have something in place. Many of our best clients came from situations where they had existing solutions. I'm curious - what's working well with your current approach? And what gaps or challenges are you still facing?"

**Discovery Points:**
- What's missing from current solution?
- How long have you had current system?
- What would make you consider changing?

## Trust/Credibility Objections

### "I've never heard of your company"
**Response:**
"That's a fair point, and I appreciate your honesty. While we might not be the biggest name in the space, that's actually worked to our clients' advantage. We're able to provide personalized attention and rapid innovation that larger companies can't match. Let me share how we've helped companies similar to yours..."

**Social Proof:**
- Share relevant case studies
- Provide customer references
- Highlight industry recognition

### "Can you provide references?"
**Response:**
"Absolutely, I'd be happy to connect you with clients who've seen similar results. Let me identify 2-3 customers in situations most similar to yours. I'll reach out to them today and can have you connected by tomorrow. Would a brief call or email introduction work better for you?"

## Competition Objections

### "We're looking at other vendors"
**Response:**
"That's smart - this is an important decision and you should evaluate all your options. I'm confident that when you compare solutions side-by-side, you'll see why [our solution] is the right choice. What criteria are most important in your evaluation?"

**Competitive Positioning:**
- Understand their evaluation criteria
- Highlight unique differentiators
- Position competition's weaknesses
- Create urgency around limited-time benefits
"""

PRICING_GUIDE = """
# Pricing Strategy and Value Communication Guide

## Pricing Philosophy
Our pricing is based on value delivered, not just features provided. Every price conversation should focus on ROI and business impact.

## Pricing Tiers

### Starter Package - $2,500/month
**Target:** Small teams (5-15 users)
**Value Proposition:** 
- 300% faster onboarding
- 50% reduction in training time
- Basic analytics and reporting

**ROI Calculation:**
- Average time saved: 10 hours/week per user
- At $50/hour fully loaded cost: $2,600/month in savings
- Net positive ROI from month 1

### Professional Package - $7,500/month
**Target:** Mid-size teams (15-50 users)
**Value Proposition:**
- Everything in Starter
- Advanced analytics and AI insights
- Custom integrations
- Priority support

**ROI Calculation:**
- Average productivity increase: 25%
- For 30 users at $75k average salary: $46,875/month value
- 6:1 ROI ratio

### Enterprise Package - Custom Pricing
**Target:** Large organizations (50+ users)
**Value Proposition:**
- Full customization
- Dedicated success manager
- Advanced security and compliance
- White-label options

## Value Messaging Scripts

### Opening Price Discussion
"Before we talk about investment, let me ask - what's it worth to your organization to [solve their main pain point]? Most companies see a 5-10x return in the first year alone."

### Handling Price Shock
"I can see the investment level caught your attention. That's normal - this represents a significant commitment. But let me put it in perspective..."

**For $7,500/month package:**
"That breaks down to just $5 per employee per day. Most companies spend more than that on coffee. But this investment will save each employee 2-3 hours per week, worth hundreds of dollars in productivity."

### ROI Positioning
"Let's look at the math together:
- Current process costs you X hours per month
- At your team's hourly rate, that's $X per month
- Our solution reduces that by 60%
- Your savings in month 1 alone cover the first 6 months of investment"

## Pricing Objection Responses

### "That's more than we budgeted"
"I understand budget constraints are real. Let me ask - what did you budget for this type of solution? Sometimes there's flexibility when the ROI is clear. What if we could show you'll save more than the total investment in the first 90 days?"

### "Your competitor is half the price"
"Price is definitely important, and you'll find solutions at different price points. What I've learned is that the cheapest option often ends up being the most expensive when you factor in implementation time, training costs, and ongoing support. Let's compare the total cost of ownership over 12 months..."

### "We need to start smaller"
"I appreciate that approach, and many of our best clients started exactly the same way. The challenge with starting too small is that you don't get the full value, which can actually make the solution feel expensive. What if we could structure this to give you the full solution with a phased rollout?"

## Payment Terms and Options

### Standard Terms
- Monthly subscription
- Annual contracts (15% discount)
- 30-day money-back guarantee

### Flexible Options
- Quarterly payments (5% discount)
- Success-based milestones
- Pilot programs (3-month minimum)

### Negotiation Guidelines
- Maximum discount: 20% for multi-year deals
- Payment terms: Net 30 standard, can extend to Net 45 for large deals
- Always require some payment upfront for custom work

## Pricing Psychology Tips

1. **Anchor High:** Start with Enterprise pricing, then show appropriate tier
2. **Bundle Value:** Present packages, not à la carte pricing
3. **Create Urgency:** Limited-time bonuses or pricing
4. **Social Proof:** "Most companies your size invest..."
5. **Future Pacing:** "When you see the results in 6 months..."
"""

PRODUCT_FEATURES = """
# Product Features and Benefits Guide

## Core Platform Capabilities

### Real-Time Conversation Analytics
**Feature:** AI-powered analysis of sales calls in real-time
**Benefit:** Never miss another buying signal or objection
**Business Impact:** 40% increase in close rates

**Key Talking Points:**
- Analyzes 200+ conversation patterns per minute
- Identifies emotional triggers and decision-making moments
- Provides instant coaching prompts during calls
- Works with all major video conferencing platforms

### Intelligent Objection Detection
**Feature:** Automatically identifies and categorizes objections
**Benefit:** Respond with perfect objection handling every time
**Business Impact:** 60% reduction in lost deals due to objections

**Demo Points:**
- Shows real-time objection identification
- Surfaces pre-written response scripts
- Tracks objection patterns across deals
- Provides objection handling training modules

### Sales Methodology Integration
**Feature:** Built-in support for major sales frameworks
**Benefit:** Enforce consistent process across team
**Business Impact:** 300% faster new rep ramp-time

**Supported Methodologies:**
- SPIN Selling
- Challenger Sale
- Solution Selling
- Value Selling
- Custom methodologies

### Performance Analytics Dashboard
**Feature:** Comprehensive sales performance insights
**Benefit:** Data-driven coaching and improvement
**Business Impact:** 25% improvement in team quota attainment

**Analytics Include:**
- Talk time ratios
- Question-to-statement ratios
- Objection handling success rates
- Conversion rates by call stage
- Individual and team benchmarks

## Advanced Features

### AI-Powered Coaching Prompts
**Feature:** Contextual suggestions during sales calls
**Benefit:** Always know what to say next
**Business Impact:** 35% increase in average deal size

**Capabilities:**
- Real-time conversation analysis
- Personalized coaching based on rep performance
- Integration with company knowledge base
- Learning from successful call patterns

### CRM Integration Suite
**Feature:** Seamless integration with major CRMs
**Benefit:** No double data entry, complete sales process
**Business Impact:** 5 hours saved per rep per week

**Supported Platforms:**
- Salesforce
- HubSpot
- Pipedrive
- Microsoft Dynamics
- Custom API integrations

### Team Collaboration Tools
**Feature:** Share best practices and learnings
**Benefit:** Scale successful techniques across team
**Business Impact:** 50% improvement in team consistency

## Competitive Differentiators

### Real-Time Processing
**Unique Value:** Only solution processing conversations in real-time
**Competitor Limitation:** Others require post-call analysis
**Customer Benefit:** Make corrections while you can still influence the outcome

### Industry-Specific Training
**Unique Value:** Pre-trained models for specific industries
**Competitor Limitation:** Generic, one-size-fits-all approach
**Customer Benefit:** Relevant insights from day one

### Privacy-First Architecture
**Unique Value:** All processing happens locally
**Competitor Limitation:** Cloud-only solutions with data security concerns
**Customer Benefit:** Complete control over sensitive sales conversations

## Feature Positioning by Buyer Type

### Sales Managers
**Primary Value:** Team performance visibility and coaching efficiency
**Key Features:**
- Team analytics dashboard
- Coaching workflow automation
- Performance benchmarking
- Skills gap analysis

### Sales Reps
**Primary Value:** In-call assistance and skill development
**Key Features:**
- Real-time coaching prompts
- Objection handling scripts
- Call preparation assistance
- Performance feedback

### Sales Operations
**Primary Value:** Process enforcement and data insights
**Key Features:**
- Methodology compliance tracking
- CRM data quality improvement
- Sales process optimization
- ROI measurement tools

### IT/Security Teams
**Primary Value:** Secure, compliant deployment
**Key Features:**
- On-premise deployment options
- Enterprise security standards
- GDPR/CCPA compliance
- Single sign-on integration

## Demo Flow Recommendations

1. **Pain Point Discovery** (5 minutes)
   - Current challenges with sales performance
   - Existing tools and gaps
   - Team size and structure

2. **Core Value Demo** (15 minutes)
   - Real-time conversation analysis
   - Objection detection and response
   - Performance dashboard overview

3. **Customization Discussion** (10 minutes)
   - Industry-specific features
   - Integration requirements
   - Team workflow adaptation

4. **ROI Presentation** (5 minutes)
   - Quantified business impact
   - Implementation timeline
   - Success metrics tracking
"""

SALES_METHODOLOGY = """
# VoiceCoach Sales Methodology

## Overview
The VoiceCoach methodology combines proven sales frameworks with AI-powered insights to create a systematic approach to sales conversations.

## Discovery Phase (30% of call time)

### Opening (First 2 minutes)
**Objective:** Build rapport and set agenda
**Key Actions:**
1. Warm greeting and connection
2. Confirm meeting agenda and time
3. Set expectations for next steps

**AI Prompts to Watch For:**
- Rapport building opportunities
- Agenda confirmation signals
- Time constraint indicators

### Situation Analysis (Next 8 minutes)
**Objective:** Understand current state and challenges
**SPIN Questions Framework:**

**Situation Questions:**
- What's your current process for [relevant area]?
- How long have you been using your current solution?
- Who else is involved in this process?

**Problem Questions:**
- What challenges are you facing with your current approach?
- How often do these issues occur?
- What impact do these problems have on your team?

**Implication Questions:**
- What happens if you don't address these challenges?
- How do these issues affect your other initiatives?
- What's the cost of maintaining the status quo?

**Need-Payoff Questions:**
- How valuable would it be to solve these problems?
- What would success look like for your team?
- How would this impact your quarterly goals?

## Presentation Phase (25% of call time)

### Tailored Demo Strategy
**Principle:** Only show features that address discovered needs
**Structure:**
1. Feature introduction
2. Benefit explanation
3. Business impact quantification
4. Proof point or case study

**Demo Best Practices:**
- Lead with outcomes, not features
- Use prospect's specific examples
- Pause for questions every 2-3 minutes
- Confirm understanding before continuing

### Objection Prevention
**Strategy:** Address concerns before they become objections
**Common Concerns:**
- Implementation complexity
- Training requirements
- Integration challenges
- Security considerations

## Objection Handling Phase (20% of call time)

### The HEARD Method
**H**alt - Stop talking and listen completely
**E**mpathize - Acknowledge their concern
**A**sk - Clarify the specific objection
**R**espond - Address with facts and benefits
**D**ouble-check - Confirm objection is resolved

### Common Objection Patterns
1. **Price Objections** (40% of objections)
   - Focus on ROI and value
   - Break down cost per user/day
   - Compare to cost of inaction

2. **Authority Objections** (25% of objections)
   - Identify decision-making process
   - Offer to present to stakeholders
   - Provide materials for internal selling

3. **Timing Objections** (20% of objections)
   - Understand urgency drivers
   - Create compelling event
   - Offer pilot or phased approach

4. **Need Objections** (15% of objections)
   - Revisit pain points discovered
   - Quantify current costs
   - Share relevant success stories

## Closing Phase (25% of call time)

### Trial Close Techniques
**Throughout the call:**
- "How does this compare to your current process?"
- "Can you see your team using this feature?"
- "What questions does this raise for you?"

### Final Close Approaches

**Assumptive Close:**
"Based on what we've discussed, it sounds like this would solve your main challenges. What's the best way to move forward?"

**Alternative Close:**
"Would you prefer to start with a pilot for your core team, or roll out to the full organization?"

**Timeline Close:**
"To hit your Q1 goals, we'd need to start implementation by [date]. Does that timeline work for you?"

### Next Steps Definition
**Always end with:**
1. Clear next action items
2. Specific timeline commitments
3. Decision criteria confirmation
4. Follow-up scheduling

## AI-Enhanced Methodology

### Real-Time Coaching Prompts
**Discovery Phase:**
- "Ask about budget/timeline"
- "Dig deeper into this pain point"
- "Confirm decision-making process"

**Demo Phase:**
- "Connect this to their stated need"
- "Ask for feedback on this feature"
- "Share [relevant case study]"

**Closing Phase:**
- "Address pricing early"
- "Ask for the sale"
- "Confirm next steps"

### Conversation Analytics
**Track Key Metrics:**
- Discovery question ratio (target: 60% questions, 40% statements)
- Objection resolution rate
- Trial close effectiveness
- Talk time balance (prospect 60%, rep 40%)

### Learning from Successful Patterns
**AI identifies:**
- Questions that lead to closes
- Demo sequences that engage prospects
- Objection responses that work
- Closing techniques by industry/role

## Coaching Integration

### Pre-Call Preparation
- Review prospect research
- Identify likely objections
- Prepare relevant case studies
- Set call objectives

### During-Call Support
- Real-time coaching prompts
- Objection response suggestions
- Next question recommendations
- Time management alerts

### Post-Call Analysis
- Conversation scoring
- Improvement opportunities
- Best practice identification
- Next step recommendations

## Success Metrics

### Individual Rep Metrics
- Discovery completion rate
- Objection resolution rate
- Close ratio improvement
- Average deal size growth

### Team Performance
- Methodology adherence
- Coaching efficiency
- Knowledge sharing
- Skill development velocity

### Business Impact
- Sales cycle reduction
- Win rate improvement
- Revenue per rep increase
- Customer satisfaction scores
"""

CASE_STUDIES = """
# Customer Success Stories and Case Studies

## TechFlow Solutions - 300% ROI in 6 Months

### Company Profile
- Industry: Software Development
- Size: 150 employees, 25 sales reps
- Challenge: New reps taking 9 months to reach quota
- Solution: VoiceCoach real-time coaching system

### Situation
TechFlow's rapid growth created a major challenge: new sales reps were struggling to learn complex technical sales conversations. Traditional training was taking too long, and inconsistent messaging was hurting close rates.

### Implementation
- Deployed VoiceCoach across entire sales team
- Integrated with existing Salesforce CRM
- Created custom coaching templates for technical sales
- Implemented methodology tracking for consistent process

### Results (6 months)
- **New rep ramp time:** 9 months → 3 months (67% reduction)
- **Team close rate:** 18% → 31% (72% improvement)
- **Average deal size:** $15K → $23K (53% increase)
- **Customer satisfaction:** 3.2/5 → 4.7/5 (47% improvement)

### ROI Calculation
- Annual investment: $180,000
- Annual benefit: $540,000 (productivity gains + larger deals)
- **Net ROI: 300%**

### Key Success Factors
1. Leadership commitment to coaching culture
2. Integration with existing sales process
3. Continuous refinement of coaching prompts
4. Regular team sharing of best practices

**Testimonial:**
*"VoiceCoach transformed our sales organization. New reps are productive in weeks instead of months, and our entire team is more confident and consistent. The ROI was clear within 90 days."* - Sarah Chen, VP of Sales

---

## GlobalManufacturing Corp - $2.3M Additional Revenue

### Company Profile
- Industry: Industrial Manufacturing
- Size: 500 employees, 40 sales reps
- Challenge: Complex B2B sales with long cycles
- Solution: VoiceCoach objection handling system

### Situation
GlobalManufacturing had expertise in their products but struggled with objection handling in complex, multi-stakeholder sales. Deals were being lost to competitors who better addressed concerns during presentations.

### Implementation
- Focused deployment on objection detection and response
- Created industry-specific objection library
- Implemented competitor comparison tools
- Added stakeholder mapping capabilities

### Results (12 months)
- **Objection resolution rate:** 45% → 78% (73% improvement)
- **Win rate vs. competition:** 32% → 51% (59% improvement)
- **Sales cycle length:** 8.2 months → 6.1 months (26% reduction)
- **Additional annual revenue:** $2.3M

### Key Objections Improved
1. **Price objections:** 90% resolution rate (was 40%)
2. **Technical specifications:** 85% resolution rate (was 30%)
3. **Implementation concerns:** 80% resolution rate (was 35%)

**Testimonial:**
*"The objection handling capability alone justified the investment. Our reps now handle price objections like seasoned veterans, and we're winning deals we used to lose."* - Mike Rodriguez, Sales Director

---

## InnovateCorp - 50% Faster New Rep Onboarding

### Company Profile
- Industry: Financial Services
- Size: 75 employees, 15 sales reps
- Challenge: Regulatory compliance in sales conversations
- Solution: VoiceCoach compliance monitoring

### Situation
InnovateCorp needed to ensure all sales conversations met strict financial services regulations while maintaining sales effectiveness. Manual compliance review was slow and expensive.

### Implementation
- Deployed real-time compliance monitoring
- Created regulatory coaching prompts
- Integrated with compliance documentation
- Added conversation recording and analysis

### Results (9 months)
- **Compliance violations:** 15/month → 1/month (93% reduction)
- **New rep certification time:** 6 weeks → 3 weeks (50% reduction)
- **Sales effectiveness maintained:** No decline in close rates
- **Compliance cost savings:** $150K annually

### Regulatory Benefits
- Automated compliance documentation
- Real-time violation prevention
- Consistent regulatory messaging
- Reduced legal review requirements

**Testimonial:**
*"VoiceCoach solved our biggest challenge: maintaining compliance without killing sales performance. Our reps are more confident because they know they're staying compliant."* - Jennifer Walsh, Compliance Director

---

## AgileStart - 200% Increase in Demo-to-Close Rate

### Company Profile
- Industry: SaaS Startup
- Size: 25 employees, 8 sales reps
- Challenge: Converting demos into closed deals
- Solution: VoiceCoach demo optimization

### Situation
AgileStart had strong product-market fit but struggled to convert interested prospects into customers. Demo conversations weren't translating into purchase decisions.

### Implementation
- Focused on demo conversation optimization
- Implemented real-time engagement tracking
- Added competitor differentiation prompts
- Created urgency and scarcity messaging

### Results (4 months)
- **Demo-to-close rate:** 12% → 36% (200% improvement)
- **Average deal size:** $8K → $12K (50% increase)
- **Sales cycle:** 45 days → 28 days (38% reduction)
- **Monthly revenue:** $40K → $95K (138% growth)

### Demo Improvements
- Better discovery during demos
- Stronger competitive positioning
- More effective urgency creation
- Improved objection prevention

**Testimonial:**
*"VoiceCoach helped us crack the code on demo conversations. We went from hoping prospects would buy to confidently expecting closes."* - David Park, CEO

---

## Success Pattern Analysis

### Common Success Factors Across All Implementations

1. **Leadership Buy-In**
   - Executive sponsorship
   - Culture of coaching acceptance
   - Investment in training and adoption

2. **Process Integration**
   - Alignment with existing sales methodology
   - CRM integration for data flow
   - Regular review and optimization

3. **Continuous Improvement**
   - Regular coaching prompt updates
   - Team feedback incorporation
   - Performance metric tracking

4. **Change Management**
   - Gradual rollout approach
   - Champion identification
   - Success story sharing

### Implementation Timeline Best Practices

**Weeks 1-2: Foundation**
- Technical setup and integration
- Initial coaching template creation
- Team training and onboarding

**Weeks 3-8: Adoption**
- Active usage monitoring
- Prompt refinement based on feedback
- Success pattern identification

**Weeks 9-12: Optimization**
- Performance metric analysis
- Advanced feature deployment
- ROI measurement and reporting

**Months 4-6: Scale**
- Methodology refinement
- Advanced analytics utilization
- Team performance comparison

### ROI Patterns Across Industries

**Technology Companies:**
- Average ROI: 250-400%
- Primary benefit: Faster rep ramp time
- Secondary benefit: Larger deal sizes

**Manufacturing:**
- Average ROI: 180-300%
- Primary benefit: Improved objection handling
- Secondary benefit: Shorter sales cycles

**Financial Services:**
- Average ROI: 200-350%
- Primary benefit: Compliance assurance
- Secondary benefit: Process consistency

**Startups:**
- Average ROI: 300-500%
- Primary benefit: Demo conversion improvement
- Secondary benefit: Sales process optimization
"""

COMPETITOR_COMPARISON = """
# Competitive Intelligence and Positioning Guide

## Market Landscape Overview

### Primary Competitors

#### Gong.io
**Market Position:** Established revenue intelligence platform
**Strengths:**
- Large customer base and market recognition
- Comprehensive conversation analytics
- Strong integration ecosystem

**Weaknesses:**
- High cost ($1,200+ per user annually)
- Complex implementation (3-6 months)
- Limited real-time coaching capabilities
- Cloud-only architecture

**Our Competitive Response:**
- Real-time coaching vs. post-call analysis
- Local processing for security concerns
- Faster implementation and lower cost
- More personalized coaching approach

#### Chorus.ai (now ZoomInfo)
**Market Position:** Revenue intelligence with ZoomInfo backing
**Strengths:**
- Integration with ZoomInfo database
- Good conversation analytics
- Market presence and funding

**Weaknesses:**
- Focuses on analytics over coaching
- Limited industry customization
- Expensive enterprise pricing
- No real-time assistance

**Our Competitive Response:**
- Active coaching vs. passive analytics
- Industry-specific training models
- Flexible pricing for growing teams
- Real-time conversation guidance

#### ExecVision
**Market Position:** Conversation intelligence for enterprise
**Strengths:**
- Enterprise feature set
- Good security and compliance
- Established customer base

**Weaknesses:**
- Limited AI coaching capabilities
- Complex user interface
- High implementation cost
- Focused on management oversight vs. rep assistance

**Our Competitive Response:**
- Rep-focused coaching vs. management reporting
- Intuitive user experience
- Rapid deployment capability
- AI-powered real-time assistance

### Secondary Competitors

#### SalesLoft Conversation Intelligence
**Position:** Part of broader sales engagement platform
**Our Advantage:** Dedicated focus on conversation intelligence and coaching

#### Outreach Conversation Intelligence  
**Position:** Integrated with Outreach sequences
**Our Advantage:** Works with any outreach tool, not locked to one platform

#### Jiminny
**Position:** UK-based conversation intelligence
**Our Advantage:** US market focus with local support and compliance

## Competitive Battle Cards

### vs. Gong.io

**When They Say:** "Gong has more customers and market share"
**Our Response:** 
"You're right that Gong has been around longer, but that actually works in your favor here. We've learned from the challenges early adopters faced with Gong and built something better. While Gong focuses on post-call analysis for managers, we provide real-time coaching for reps. You get insights when you can still influence the outcome."

**Key Differentiators:**
- Real-time coaching (Gong is post-call only)
- Local data processing (Gong is cloud-only)
- $300/user vs. $1,200+/user annually
- 2-week implementation vs. 3-6 months

### vs. Chorus.ai

**When They Say:** "Chorus has ZoomInfo integration"
**Our Response:**
"The ZoomInfo integration is useful, but most of our clients find they need coaching more than they need another contact database. Chorus focuses on what happened in past calls, while we help reps perform better on current calls. Plus, we integrate with whatever contact database you're already using."

**Key Differentiators:**
- Coaching-first approach vs. analytics-first
- Real-time assistance vs. historical reporting
- Faster implementation and setup
- Better price-to-value ratio

### vs. ExecVision

**When They Say:** "ExecVision has better security for enterprise"
**Our Response:**
"Security is crucial, and we actually offer something unique - local processing that keeps your conversations completely on-premises. ExecVision processes everything in the cloud. With our approach, you get enterprise security with the benefit of never having sensitive sales conversations leave your infrastructure."

**Key Differentiators:**
- Local/on-premise processing option
- Rep coaching vs. manager reporting focus
- Simpler implementation and management
- More intuitive user interface

## Competitive Positioning Scripts

### Discovery Questions to Uncover Competition
1. "What tools are you currently evaluating for this project?"
2. "What's most important to you in choosing a solution?"
3. "What concerns do you have about the other options?"
4. "What would the ideal solution look like?"
5. "Who else is involved in this decision?"

### Positioning Against "Cheaper" Options
**Prospect:** "Company X is half the price"
**Response:**
"I appreciate that price is important. When you look at solutions that are significantly cheaper, it's usually because they're missing key capabilities that end up costing you more in the long run. For example, [specific limitation of competitor] means you'll need to [additional cost/effort]. When you factor in the full cost of ownership, including setup time, training, and ongoing support, we're often the most cost-effective choice. Plus, the business impact we deliver typically pays for the difference in the first month."

### Positioning Against "Enterprise" Options
**Prospect:** "Company Y has more enterprise features"
**Response:**
"You're evaluating enterprise solutions, which tells me you take this seriously. What we've found is that many 'enterprise' platforms are actually over-engineered for what most teams need. You end up paying for complexity instead of results. Our approach is to deliver the specific outcomes you need without the overhead. What matters more - having every possible feature, or getting 10x ROI in the first quarter?"

## Win/Loss Analysis Insights

### Why We Win
1. **Real-time coaching capability** (mentioned in 78% of wins)
2. **Faster implementation** (mentioned in 65% of wins)  
3. **Better price-to-value ratio** (mentioned in 55% of wins)
4. **More intuitive user experience** (mentioned in 48% of wins)
5. **Local data processing option** (mentioned in 31% of wins)

### Why We Lose
1. **Brand recognition concerns** (mentioned in 45% of losses)
2. **Integration ecosystem** (mentioned in 35% of losses)
3. **Enterprise feature requirements** (mentioned in 28% of losses)
4. **Existing vendor relationships** (mentioned in 22% of losses)

### How to Address Loss Reasons

**Brand Recognition:**
- Lead with customer success stories
- Offer extended trial periods
- Provide customer references
- Highlight rapid innovation capabilities

**Integration Ecosystem:**
- Demonstrate key integrations working
- Commit to building needed integrations
- Show API flexibility
- Partner with implementation consultants

**Enterprise Features:**
- Understand specific feature requirements
- Show roadmap for requested capabilities
- Offer custom development
- Focus on outcomes vs. features

## Competitive Intelligence Gathering

### Sources to Monitor
- Competitor websites and pricing pages
- G2 and Capterra reviews
- LinkedIn for team changes
- Customer feedback about competitors
- Sales team competitive encounters

### Quarterly Competitive Review
1. **Feature gap analysis**
2. **Pricing comparison updates**
3. **Win/loss pattern analysis**
4. **New competitor identification**
5. **Positioning message refinement**

### Competitive Response Strategy
- Never disparage competitors directly
- Focus on unique value propositions
- Use third-party validation when possible
- Create urgency around limited-time advantages
- Always bring conversation back to customer outcomes
"""

DISCOVERY_QUESTIONS = """
# Discovery Questions Framework for Sales Conversations

## Opening Discovery (First 10 minutes)

### Situation Assessment
**Goal:** Understand current state and context

**Company/Role Questions:**
- "Tell me about your role and how it fits into the organization"
- "What does your typical day look like?"
- "How long have you been in this position?"
- "What are your main responsibilities when it comes to [relevant area]?"

**Current Process Questions:**
- "Walk me through your current process for [relevant activity]"
- "What tools or systems do you use today?"
- "Who else is involved in this process?"
- "How long have you been doing it this way?"

**Team Structure Questions:**
- "How is your team organized around this?"
- "Who would be the primary users of a solution like this?"
- "What's the decision-making process for new tools?"
- "Who else would need to be involved in evaluating options?"

## Problem Discovery (Deep Dive - 15 minutes)

### Pain Point Identification
**Goal:** Uncover specific challenges and their impact

**Current Challenge Questions:**
- "What challenges are you facing with your current approach?"
- "What's not working as well as you'd like?"
- "What keeps you up at night about this area?"
- "Where do you see the biggest gaps in your process?"

**Frequency and Scale Questions:**
- "How often do these issues occur?"
- "Can you give me a specific example of when this happened?"
- "Is this getting better or worse over time?"
- "What percentage of [activities] are affected by this?"

**Impact Assessment Questions:**
- "How do these challenges affect your team's productivity?"
- "What impact does this have on your customers?"
- "How does this affect your ability to hit your goals?"
- "What other areas of the business are impacted?"

### Root Cause Analysis
**Goal:** Understand why problems exist

**Causation Questions:**
- "What do you think is causing these issues?"
- "Have you tried to address this before? What happened?"
- "What would need to change to solve this?"
- "Is this a process issue, a people issue, or a technology issue?"

**Historical Context Questions:**
- "How long has this been a challenge?"
- "What triggered this to become a priority now?"
- "What's changed in your business that makes this urgent?"
- "What happens if you don't address this in the next 6 months?"

## Implication Development (Consequence Exploration - 10 minutes)

### Business Impact Questions
**Goal:** Quantify costs of inaction

**Financial Impact Questions:**
- "What's this costing you in terms of lost productivity?"
- "How much time does your team spend dealing with these issues?"
- "What revenue opportunities might you be missing?"
- "What's the impact on your operating costs?"

**Strategic Impact Questions:**
- "How does this affect your competitive position?"
- "What impact does this have on employee satisfaction?"
- "How does this affect your ability to scale?"
- "What risks does this create for the organization?"

**Future Consequences Questions:**
- "If this continues for another year, what happens?"
- "What other problems might this create down the road?"
- "How might this affect your industry position?"
- "What opportunities might you miss if this isn't resolved?"

### Urgency Creation Questions
**Goal:** Establish timeline pressure

**Timeline Questions:**
- "When do you need this resolved by?"
- "What's driving the timeline for making a decision?"
- "Are there any upcoming events or deadlines that affect this?"
- "What happens if you miss your target date?"

**Compelling Event Questions:**
- "What made this a priority right now?"
- "Is there a specific event or trigger that's driving this?"
- "What changed to make this urgent?"
- "What are the consequences of delaying action?"

## Solution Visioning (Ideal State - 10 minutes)

### Value Discovery Questions
**Goal:** Understand desired outcomes and success criteria

**Outcome Definition Questions:**
- "What would success look like 6 months from now?"
- "If we could solve all these challenges, how would that change things?"
- "What capabilities would you have that you don't have today?"
- "How would your day-to-day work be different?"

**Benefit Quantification Questions:**
- "What would it be worth to solve these problems?"
- "How would this impact your team's productivity?"
- "What revenue opportunities would this create?"
- "How would this affect your competitive advantage?"

**Priority Ranking Questions:**
- "Of all the benefits we've discussed, which is most important?"
- "What's the primary outcome you're hoping to achieve?"
- "If you could only solve one thing, what would it be?"
- "Which challenge is costing you the most right now?"

### Requirements Gathering
**Goal:** Understand solution criteria and constraints

**Functional Requirements Questions:**
- "What capabilities are must-haves vs. nice-to-haves?"
- "Are there specific features or functions you need?"
- "What integrations would be required?"
- "What are your security or compliance requirements?"

**Implementation Questions:**
- "What's your timeline for getting this implemented?"
- "Who would be responsible for managing this internally?"
- "What does your rollout process typically look like?"
- "What would need to happen to ensure successful adoption?"

## Budget and Authority Discovery (Investment Framework - 10 minutes)

### Financial Framework Questions
**Goal:** Understand budget parameters and decision criteria

**Investment Approach Questions:**
- "How do you typically approach investments like this?"
- "What's your framework for evaluating ROI?"
- "Have you budgeted for this type of solution?"
- "What would justify the investment for you?"

**Budget Range Questions:**
- "What range were you thinking about for this type of solution?"
- "How does this compare to other investments you're making?"
- "What would be too much to spend on solving this?"
- "If we could show clear ROI, is there flexibility in the budget?"

### Decision Process Questions
**Goal:** Map decision-making process and criteria

**Authority Questions:**
- "Who else would be involved in making this decision?"
- "What's your role in the decision-making process?"
- "Who would need to approve an investment of this size?"
- "Are there other stakeholders who care about this outcome?"

**Process Questions:**
- "What does your typical buying process look like?"
- "What criteria will you use to evaluate options?"
- "How do you typically make decisions about new technology?"
- "What would need to happen for you to move forward?"

**Timeline Questions:**
- "When are you looking to make a decision?"
- "What's your implementation timeline?"
- "Are there any factors that could accelerate or delay this?"
- "When would you need to have this in place?"

## Competitive Discovery (Market Intelligence - 5 minutes)

### Alternative Solution Questions
**Goal:** Understand competition and evaluation criteria

**Options Assessment Questions:**
- "What other solutions are you considering?"
- "Have you looked at other ways to solve this problem?"
- "What would happen if you decided to build something internally?"
- "Are you considering doing nothing and living with the status quo?"

**Evaluation Criteria Questions:**
- "What's most important to you in choosing a solution?"
- "How will you compare the different options?"
- "What are your biggest concerns about making the wrong choice?"
- "What would make one solution clearly better than others?"

**Experience Questions:**
- "Have you implemented similar solutions before?"
- "What worked well or didn't work well in past implementations?"
- "What lessons learned would you apply to this decision?"
- "What would you do differently this time?"

## Industry-Specific Discovery Questions

### Technology Companies
- "How do you handle technical debt in this area?"
- "What's your release cycle impact?"
- "How does this affect your development velocity?"
- "What compliance requirements do you have?"

### Financial Services
- "What regulatory considerations apply here?"
- "How do you handle audit requirements?"
- "What's your risk tolerance for new solutions?"
- "How does this affect customer data security?"

### Manufacturing
- "How does this impact your production schedules?"
- "What's the effect on quality control processes?"
- "How do supply chain considerations factor in?"
- "What about integration with existing systems?"

### Healthcare
- "What HIPAA compliance requirements apply?"
- "How does this affect patient care quality?"
- "What's the impact on clinical workflows?"
- "Are there integration needs with existing EMR systems?"

## Advanced Discovery Techniques

### Emotional Discovery
**Goal:** Understand personal motivations and concerns

**Personal Impact Questions:**
- "How would solving this affect you personally?"
- "What would success mean for your career?"
- "What keeps you motivated about this project?"
- "What are you most excited about changing?"

**Concern Exploration:**
- "What are your biggest concerns about moving forward?"
- "What would need to happen for you to feel confident?"
- "What past experiences influence your thinking here?"
- "What would make this feel like a safe decision?"

### Vision Expansion
**Goal:** Help prospect envision transformation

**Future State Questions:**
- "Imagine it's a year from now and this has been a huge success. What changed?"
- "How would your competitors react if you had these capabilities?"
- "What new opportunities would this create for your business?"
- "How would your customers' experience be different?"

### Risk Assessment
**Goal:** Understand decision-making risk factors

**Risk Tolerance Questions:**
- "What's the biggest risk in making this decision?"
- "What's the biggest risk in not making this decision?"
- "How do you typically mitigate risks with new solutions?"
- "What would make you feel confident about moving forward?"

## Discovery Question Response Handling

### When They Say "I Don't Know"
**Follow-up approaches:**
- "Who would know that information?"
- "What's your best guess based on what you've seen?"
- "How could we find that out?"
- "What would you estimate?"

### When They're Vague
**Clarification techniques:**
- "Can you give me a specific example?"
- "Help me understand what that looks like day-to-day"
- "What does that mean in practical terms?"
- "Can you quantify that for me?"

### When They Seem Resistant
**Softening approaches:**
- "I'm just trying to understand the situation better..."
- "This helps me figure out if we're a good fit..."
- "I want to make sure I can give you relevant information..."
- "No pressure - I'm just curious about..."
"""

CLOSING_TECHNIQUES = """
# Closing Techniques and Strategies Guide

## Closing Philosophy and Mindset

### The Modern Approach to Closing
**Principle:** Closing is a natural conclusion to a consultative sales process, not a high-pressure tactic.

**Key Mindsets:**
1. **Always Be Closing (ABC) vs. Always Be Helping (ABH)**
   - Focus on helping prospect achieve their goals
   - Close becomes natural outcome of value demonstration
   - Build confidence through education and problem-solving

2. **Permission-Based Closing**
   - Ask permission before moving to close
   - "Based on what we've discussed, it sounds like this could really help. Should we talk about moving forward?"
   - Creates collaborative decision-making environment

3. **Assumptive Confidence**
   - Assume the prospect will buy if value is clear
   - Use assumptive language naturally
   - Plan implementation details during presentation

## Trial Closing Techniques (Throughout the Call)

### Purpose of Trial Closes
- Test prospect's level of interest and engagement
- Identify objections early when easier to address
- Build momentum toward final close
- Gauge decision-making timeline and process

### Effective Trial Close Questions

**Feature/Benefit Trial Closes:**
- "How does this capability compare to what you're doing now?"
- "Can you see your team using this feature?"
- "Which of these benefits would have the biggest impact for you?"
- "What questions does this raise for your situation?"

**Implementation Trial Closes:**
- "Who on your team would be most excited about this?"
- "How would you want to roll this out to your organization?"
- "What would your timeline look like for getting started?"
- "Where would you see the biggest impact first?"

**Value Confirmation Trial Closes:**
- "Does this address the main challenges you mentioned?"
- "How would this change your current process?"
- "What would success look like with this in place?"
- "Is this the kind of solution you had in mind?"

## Primary Closing Techniques

### 1. Assumptive Close
**When to Use:** When prospect has shown strong interest and few objections
**Approach:** Assume they've decided to move forward and discuss implementation

**Scripts:**
- "Great, so it sounds like this is exactly what you need. What's the best way to get started?"
- "Perfect. To have this ready for your Q1 goals, we should start the setup process next week. Does that timeline work?"
- "Based on everything we've discussed, this is clearly the right solution. Let's talk about implementation."

**Follow-up Actions:**
- Start discussing implementation details
- Ask about team introductions and next steps
- Confirm timeline and success metrics

### 2. Alternative Choice Close
**When to Use:** When prospect is interested but seems hesitant about commitment
**Approach:** Give them choices that assume they're moving forward

**Scripts:**
- "Would you prefer to start with the department pilot or roll out company-wide?"
- "Should we schedule the kickoff for next week or the week after?"
- "Are you thinking monthly or annual billing would work better?"
- "Would you like to begin with the core features or the full suite?"

**Benefits:**
- Reduces decision fatigue by focusing choice
- Assumes forward movement
- Gives prospect sense of control
- Easier than yes/no decision

### 3. Summary Close
**When to Use:** After comprehensive demo or multiple meetings
**Approach:** Summarize key benefits and ask for decision

**Structure:**
1. Recap their main challenges
2. Review how your solution addresses each
3. Quantify the value/impact
4. Ask for the business

**Script Template:**
"Let me summarize what we've covered. You mentioned [challenge 1, 2, 3]. Our solution addresses these by [benefit 1, 2, 3], which means [impact 1, 2, 3]. Based on your numbers, you're looking at [ROI calculation]. Does it make sense to move forward?"

### 4. Urgency Close
**When to Use:** When there's a legitimate reason to act quickly
**Approach:** Create time pressure based on real factors

**Legitimate Urgency Factors:**
- Limited-time pricing or bonus
- Implementation timeline for their goals
- Resource availability constraints
- Market/competitive timing

**Scripts:**
- "To hit your Q1 targets, we'd need to start by [date]. Can we make that happen?"
- "We have implementation capacity available this month, but December is booking up. Should we reserve your spot?"
- "The current pricing is good through month-end. After that, it goes up 15%. What makes sense?"

### 5. Question Close
**When to Use:** When you need to identify final objections
**Approach:** Ask direct questions to uncover resistance

**Scripts:**
- "What questions or concerns do you have about moving forward?"
- "What would need to happen for you to feel comfortable saying yes?"
- "Is there anything preventing you from making this decision today?"
- "What additional information do you need to move forward?"

### 6. Silence Close
**When to Use:** After presenting final offer or asking for decision
**Approach:** Ask for decision, then remain silent

**Process:**
1. Present complete solution and pricing
2. Ask: "What do you think?"
3. Stay silent until they respond
4. Let them process and voice any concerns

**Key Rules:**
- First person to speak after close question often loses
- Comfortable with silence shows confidence
- Gives prospect time to think without pressure

## Advanced Closing Strategies

### The Takeaway Close
**When to Use:** When prospect seems to be taking you for granted
**Approach:** Suggest solution might not be right fit

**Scripts:**
- "Based on what you're telling me, I'm not sure we're the right fit. Maybe you should stick with your current approach."
- "It sounds like you're not ready for this level of solution. Perhaps we should revisit this in 6 months."
- "I'm concerned about whether you have the internal resources to make this successful."

**Psychology:** Creates scarcity and makes prospect want to prove they qualify

### The Sharp Angle Close
**When to Use:** When prospect asks for concession during negotiation
**Approach:** Agree to concession IF they commit immediately

**Scripts:**
- "If I can get you that additional discount, can we finalize this today?"
- "If we include the training at no charge, are you ready to move forward?"
- "If I can extend the payment terms, do we have a deal?"

**Requirements:**
- Only use if you have authority to make concession
- Must get immediate commitment
- Don't negotiate further after agreement

### The Puppy Dog Close
**When to Use:** When prospect has concerns about committing
**Approach:** Offer risk-free trial or pilot program

**Scripts:**
- "Why don't we start with a 30-day pilot for your core team? No commitment beyond that."
- "Let's do a proof-of-concept project. If you don't see results, we'll part ways professionally."
- "What if we guarantee results? If you don't see [specific outcome] in 90 days, we'll refund everything."

**Benefits:**
- Reduces risk perception
- Gets product in use (creates switching cost)
- Demonstrates confidence in solution

## Objection Handling During Close

### Common Closing Objections and Responses

**"I need to think about it"**
- "I understand this is a big decision. What specifically would you like to think about?"
- "Of course, take the time you need. What concerns should we address while we're together?"
- "That makes sense. In my experience, when people say that, there's usually one specific thing bothering them. What is it for you?"

**"I need to discuss with my team"**
- "Absolutely, this affects the whole team. To help you present this effectively, what concerns do you think they'll have?"
- "That's smart to involve the team. Would it be helpful if I joined that discussion?"
- "Of course. What's the best way to make sure they have all the information they need?"

**"It's not in the budget"**
- "I understand budget constraints are real. If we could show this pays for itself in 90 days, does that change things?"
- "Budget is important. What would need to happen for this to become a budget priority?"
- "Fair enough. When do budgets typically get reviewed for new initiatives?"

**"Your price is too high"**
- "I appreciate your concern about the investment. When you look at the value we're delivering, how do you see the ROI?"
- "Price is important. Let's make sure we're comparing apples to apples. What other options are you considering?"
- "I understand. What price point would make this an easy decision?"

### The CLOSE Method for Objection Handling

**C** - Clarify the objection
**L** - Listen completely without interrupting  
**O** - Overcome with facts and benefits
**S** - Seek agreement that objection is resolved
**E** - Execute the close again

## Closing in Different Scenarios

### First Meeting Close
**Challenges:** Limited relationship, incomplete discovery
**Approach:** Focus on next step close rather than final sale

**Scripts:**
- "Based on what I understand so far, this could be really valuable. Should we set up a deeper dive with your team?"
- "This seems like a good fit for your challenges. What's the next step in your process?"
- "I'd love to show you exactly how this would work for your situation. Can we schedule a custom demo?"

### Follow-up Meeting Close
**Advantages:** Established relationship, completed discovery
**Approach:** Reference previous conversations and build on momentum

**Scripts:**
- "When we talked last week, you mentioned [pain point]. Now that you've seen how we solve that, are you ready to move forward?"
- "Based on all our conversations, this clearly addresses your main challenges. What's preventing us from getting started?"

### Group Presentation Close
**Challenges:** Multiple stakeholders, varied concerns
**Approach:** Address group dynamics and individual concerns

**Techniques:**
- Get individual agreements before group close
- Address each stakeholder's specific interests
- Use social proof and momentum
- Handle objections publicly to build consensus

### Virtual/Remote Close
**Challenges:** Less personal connection, screen fatigue
**Approach:** Create engagement and urgency despite distance

**Best Practices:**
- Use screen share for visual aids
- Ask more questions to maintain engagement
- Create interaction opportunities
- Schedule follow-up immediately after

## Post-Close Best Practices

### Immediate Post-Close Actions
1. **Congratulate the decision**
   - "Congratulations, this is going to make a huge impact for your team"
   - Express genuine enthusiasm about partnership

2. **Confirm next steps**
   - Document agreed timeline and deliverables
   - Schedule kickoff meeting
   - Identify key contacts and responsibilities

3. **Address buyer's remorse prevention**
   - Reinforce the value they'll receive
   - Share relevant success stories
   - Provide implementation roadmap

### Documentation Requirements
- Signed agreement or purchase order
- Implementation timeline and milestones
- Contact information for all stakeholders
- Success metrics and measurement criteria
- Any special terms or commitments made

## Measuring Closing Effectiveness

### Key Metrics to Track
- **Close rate:** Percentage of qualified leads that become customers
- **Sales cycle length:** Time from first contact to closed deal
- **Average deal size:** Revenue per closed opportunity
- **Close ratio by technique:** Which closing methods work best

### Continuous Improvement Process
1. **Record closing attempts:** Note which techniques were used
2. **Analyze successful closes:** What factors contributed to success?
3. **Review lost opportunities:** Where did the close fail?
4. **Refine techniques:** Adjust approach based on results
5. **Practice regularly:** Role-play closing scenarios with team

### Common Closing Mistakes to Avoid
- Closing too early (before establishing value)
- Closing too late (missing buying signals)
- Using high-pressure tactics
- Failing to ask for the sale
- Not handling objections completely
- Talking after asking for decision
- Making concessions without getting commitment
- Not confirming next steps after close
"""

# Export all sample materials
SAMPLE_MATERIALS = {
    "objection_handlers": OBJECTION_HANDLERS,
    "pricing_guide": PRICING_GUIDE,
    "product_features": PRODUCT_FEATURES,
    "sales_methodology": SALES_METHODOLOGY,
    "case_studies": CASE_STUDIES,
    "competitor_comparison": COMPETITOR_COMPARISON,
    "discovery_questions": DISCOVERY_QUESTIONS,
    "closing_techniques": CLOSING_TECHNIQUES
}