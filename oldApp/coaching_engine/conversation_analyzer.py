"""
Real-Time Conversation Analysis Engine for VoiceCoach
Analyzes conversation flow, detects intent, and provides context for coaching prompts
"""

import re
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Set
from enum import Enum
from datetime import datetime, timedelta

from ..utils.led_breadcrumb import LEDBreadcrumbTrail


class SalesStage(Enum):
    """Sales conversation stages for context analysis."""
    PROSPECTING = "prospecting"
    DISCOVERY = "discovery"
    DEMO = "demo"
    PROPOSAL = "proposal"
    OBJECTION_HANDLING = "objection_handling"
    NEGOTIATION = "negotiation"
    CLOSING = "closing"
    FOLLOW_UP = "follow_up"


class SentimentLevel(Enum):
    """Sentiment levels for conversation analysis."""
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"


@dataclass
class ConversationTurn:
    """Individual conversation turn with metadata."""
    speaker_id: str
    content: str
    timestamp: datetime
    confidence: float
    detected_intent: Optional[str] = None
    sentiment: Optional[SentimentLevel] = None
    keywords: List[str] = field(default_factory=list)
    objections: List[str] = field(default_factory=list)
    buying_signals: List[str] = field(default_factory=list)


@dataclass
class ConversationContext:
    """Comprehensive conversation context for coaching."""
    conversation_id: str
    start_time: datetime
    duration_minutes: int
    current_stage: SalesStage
    participant_roles: Dict[str, str]
    recent_turns: List[ConversationTurn]
    conversation_summary: str
    key_topics: List[str]
    detected_objections: List[str]
    buying_signals: List[str]
    sentiment_trend: List[Tuple[datetime, SentimentLevel]]
    next_best_actions: List[str]
    urgency_score: float  # 0.0 to 1.0
    complexity_score: float  # 0.0 to 1.0


class ConversationAnalyzer:
    """
    Advanced conversation analysis engine for real-time sales coaching.
    
    Features:
    - Real-time conversation flow analysis
    - Sales stage detection and progression tracking
    - Intent recognition and objection detection
    - Sentiment analysis and buying signal identification
    - Context building for intelligent coaching prompts
    - Performance optimization for <500ms analysis time
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Conversation state tracking
        self.active_conversations: Dict[str, ConversationContext] = {}
        self.analysis_times = []
        
        # Sales methodology patterns
        self.stage_keywords = self._initialize_stage_keywords()
        self.objection_patterns = self._initialize_objection_patterns()
        self.buying_signal_patterns = self._initialize_buying_signal_patterns()
        self.sentiment_indicators = self._initialize_sentiment_indicators()
        
        # Intent classification models (simplified rule-based for performance)
        self.intent_patterns = self._initialize_intent_patterns()
        
        self.logger.info("Conversation Analyzer initialized with sales methodology patterns")
    
    def analyze_conversation_turn(
        self,
        conversation_id: str,
        speaker_id: str,
        content: str,
        timestamp: Optional[datetime] = None,
        confidence: float = 1.0
    ) -> ConversationContext:
        """
        Analyze new conversation turn and update context.
        
        Args:
            conversation_id: Unique conversation identifier
            speaker_id: Speaker identifier (e.g., "salesperson", "prospect")
            content: Transcribed speech content
            timestamp: When the speech occurred
            confidence: Transcription confidence score
        
        Returns:
            Updated conversation context with coaching insights
        """
        trail = LEDBreadcrumbTrail("ConversationAnalyzer")
        
        # LED 300: Conversation analysis start
        trail.light(300, "CONVERSATION_ANALYSIS_START", 
                   {"conv_id": conversation_id, "speaker": speaker_id})
        
        start_time = time.time()
        
        if timestamp is None:
            timestamp = datetime.now()
        
        # Initialize conversation context if new
        if conversation_id not in self.active_conversations:
            self.active_conversations[conversation_id] = self._initialize_conversation_context(
                conversation_id, timestamp, speaker_id
            )
            trail.light(301, "NEW_CONVERSATION_INITIALIZED", {"conv_id": conversation_id})
        
        context = self.active_conversations[conversation_id]
        
        # LED 510: Content preprocessing
        trail.light(510, "CONTENT_PREPROCESSING_START", {"content_length": len(content)})
        
        # Create conversation turn
        turn = ConversationTurn(
            speaker_id=speaker_id,
            content=content,
            timestamp=timestamp,
            confidence=confidence
        )
        
        # Analyze conversation turn
        turn = self._analyze_turn_content(turn, trail)
        
        # LED 302: Context update start
        trail.light(302, "CONTEXT_UPDATE_START", None)
        
        # Update conversation context
        context.recent_turns.append(turn)
        context.recent_turns = context.recent_turns[-20:]  # Keep last 20 turns
        
        # Update conversation metadata
        context.duration_minutes = int((timestamp - context.start_time).total_seconds() / 60)
        
        # Analyze conversation flow and update context
        context = self._update_conversation_context(context, turn, trail)
        
        # LED 303: Context update complete
        analysis_time_ms = int((time.time() - start_time) * 1000)
        self.analysis_times.append(analysis_time_ms)
        
        trail.light(303, "CONVERSATION_ANALYSIS_COMPLETE", 
                   {"analysis_time_ms": analysis_time_ms, "stage": context.current_stage.value})
        
        # Performance validation
        if analysis_time_ms > 500:
            trail.fail(304, "ANALYSIS_PERFORMANCE_WARNING", 
                      f"Analysis took {analysis_time_ms}ms, target is <500ms")
        
        return context
    
    def get_coaching_context(self, conversation_id: str) -> Optional[ConversationContext]:
        """Get current conversation context for coaching prompt generation."""
        return self.active_conversations.get(conversation_id)
    
    def _analyze_turn_content(self, turn: ConversationTurn, trail: LEDBreadcrumbTrail) -> ConversationTurn:
        """Analyze individual turn content for insights."""
        
        # LED 511: Intent detection
        trail.light(511, "INTENT_DETECTION_START", None)
        turn.detected_intent = self._detect_intent(turn.content)
        
        # LED 512: Sentiment analysis
        trail.light(512, "SENTIMENT_ANALYSIS_START", None)
        turn.sentiment = self._analyze_sentiment(turn.content)
        
        # LED 513: Keyword extraction
        trail.light(513, "KEYWORD_EXTRACTION_START", None)
        turn.keywords = self._extract_keywords(turn.content)
        
        # LED 514: Objection detection
        trail.light(514, "OBJECTION_DETECTION_START", None)
        turn.objections = self._detect_objections(turn.content)
        
        # LED 515: Buying signal detection
        trail.light(515, "BUYING_SIGNAL_DETECTION_START", None)
        turn.buying_signals = self._detect_buying_signals(turn.content)
        
        trail.light(516, "TURN_ANALYSIS_COMPLETE", 
                   {"intent": turn.detected_intent, "sentiment": turn.sentiment.value if turn.sentiment else None})
        
        return turn
    
    def _update_conversation_context(
        self, 
        context: ConversationContext, 
        turn: ConversationTurn,
        trail: LEDBreadcrumbTrail
    ) -> ConversationContext:
        """Update comprehensive conversation context."""
        
        # LED 520: Stage detection
        trail.light(520, "STAGE_DETECTION_START", None)
        new_stage = self._detect_sales_stage(context, turn)
        if new_stage != context.current_stage:
            context.current_stage = new_stage
            trail.light(521, "STAGE_TRANSITION", {"new_stage": new_stage.value})
        
        # LED 522: Topic aggregation
        trail.light(522, "TOPIC_AGGREGATION_START", None)
        context.key_topics = self._aggregate_key_topics(context)
        
        # LED 523: Objection aggregation
        trail.light(523, "OBJECTION_AGGREGATION_START", None)
        context.detected_objections = self._aggregate_objections(context)
        
        # LED 524: Buying signal aggregation
        trail.light(524, "BUYING_SIGNAL_AGGREGATION_START", None)
        context.buying_signals = self._aggregate_buying_signals(context)
        
        # LED 525: Sentiment tracking
        trail.light(525, "SENTIMENT_TRACKING_START", None)
        if turn.sentiment:
            context.sentiment_trend.append((turn.timestamp, turn.sentiment))
            context.sentiment_trend = context.sentiment_trend[-10:]  # Keep last 10 sentiment points
        
        # LED 526: Urgency calculation
        trail.light(526, "URGENCY_CALCULATION_START", None)
        context.urgency_score = self._calculate_urgency_score(context)
        
        # LED 527: Complexity calculation
        trail.light(527, "COMPLEXITY_CALCULATION_START", None)
        context.complexity_score = self._calculate_complexity_score(context)
        
        # LED 528: Summary generation
        trail.light(528, "SUMMARY_GENERATION_START", None)
        context.conversation_summary = self._generate_conversation_summary(context)
        
        # LED 529: Next actions prediction
        trail.light(529, "NEXT_ACTIONS_PREDICTION_START", None)
        context.next_best_actions = self._predict_next_actions(context)
        
        trail.light(530, "CONTEXT_UPDATE_COMPLETE", 
                   {"urgency": context.urgency_score, "complexity": context.complexity_score})
        
        return context
    
    def _detect_intent(self, content: str) -> str:
        """Detect speaker intent from content."""
        content_lower = content.lower()
        
        for intent, patterns in self.intent_patterns.items():
            if any(pattern in content_lower for pattern in patterns):
                return intent
        
        return "general_conversation"
    
    def _analyze_sentiment(self, content: str) -> SentimentLevel:
        """Analyze sentiment of content."""
        content_lower = content.lower()
        
        positive_score = sum(1 for word in self.sentiment_indicators["positive"] if word in content_lower)
        negative_score = sum(1 for word in self.sentiment_indicators["negative"] if word in content_lower)
        
        total_score = positive_score - negative_score
        
        if total_score >= 2:
            return SentimentLevel.VERY_POSITIVE
        elif total_score == 1:
            return SentimentLevel.POSITIVE
        elif total_score == 0:
            return SentimentLevel.NEUTRAL
        elif total_score == -1:
            return SentimentLevel.NEGATIVE
        else:
            return SentimentLevel.VERY_NEGATIVE
    
    def _extract_keywords(self, content: str) -> List[str]:
        """Extract key sales-relevant terms from content."""
        content_lower = content.lower()
        keywords = []
        
        # Extract sales methodology keywords
        for stage, stage_keywords in self.stage_keywords.items():
            for keyword in stage_keywords:
                if keyword in content_lower and keyword not in keywords:
                    keywords.append(keyword)
        
        return keywords[:10]  # Limit to top 10 keywords
    
    def _detect_objections(self, content: str) -> List[str]:
        """Detect objections in content."""
        content_lower = content.lower()
        detected_objections = []
        
        for objection_type, patterns in self.objection_patterns.items():
            if any(pattern in content_lower for pattern in patterns):
                detected_objections.append(objection_type)
        
        return detected_objections
    
    def _detect_buying_signals(self, content: str) -> List[str]:
        """Detect buying signals in content."""
        content_lower = content.lower()
        detected_signals = []
        
        for signal_type, patterns in self.buying_signal_patterns.items():
            if any(pattern in content_lower for pattern in patterns):
                detected_signals.append(signal_type)
        
        return detected_signals
    
    def _detect_sales_stage(self, context: ConversationContext, turn: ConversationTurn) -> SalesStage:
        """Detect current sales stage based on conversation content."""
        content_lower = turn.content.lower()
        
        # Stage detection based on keywords and patterns
        stage_scores = {}
        
        for stage, keywords in self.stage_keywords.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            if score > 0:
                stage_scores[stage] = score
        
        # If objections detected, likely in objection handling
        if turn.objections:
            stage_scores["objection_handling"] = stage_scores.get("objection_handling", 0) + 2
        
        # If buying signals detected, likely in closing
        if turn.buying_signals:
            stage_scores["closing"] = stage_scores.get("closing", 0) + 2
        
        # Return stage with highest score, default to current stage
        if stage_scores:
            best_stage = max(stage_scores.items(), key=lambda x: x[1])[0]
            return SalesStage(best_stage)
        
        return context.current_stage
    
    def _aggregate_key_topics(self, context: ConversationContext) -> List[str]:
        """Aggregate key topics from recent conversation turns."""
        all_keywords = []
        for turn in context.recent_turns[-10:]:  # Last 10 turns
            all_keywords.extend(turn.keywords)
        
        # Count frequency and return top topics
        keyword_counts = {}
        for keyword in all_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
        
        return sorted(keyword_counts.keys(), key=lambda k: keyword_counts[k], reverse=True)[:5]
    
    def _aggregate_objections(self, context: ConversationContext) -> List[str]:
        """Aggregate objections from recent conversation."""
        all_objections = []
        for turn in context.recent_turns[-10:]:
            all_objections.extend(turn.objections)
        
        return list(set(all_objections))  # Return unique objections
    
    def _aggregate_buying_signals(self, context: ConversationContext) -> List[str]:
        """Aggregate buying signals from recent conversation."""
        all_signals = []
        for turn in context.recent_turns[-10:]:
            all_signals.extend(turn.buying_signals)
        
        return list(set(all_signals))  # Return unique signals
    
    def _calculate_urgency_score(self, context: ConversationContext) -> float:
        """Calculate urgency score based on conversation context."""
        urgency = 0.0
        
        # High urgency indicators
        if context.detected_objections:
            urgency += 0.3  # Objections need immediate attention
        
        if context.current_stage in [SalesStage.CLOSING, SalesStage.NEGOTIATION]:
            urgency += 0.4  # Critical sales stages
        
        if context.buying_signals:
            urgency += 0.3  # Opportunity to close
        
        # Recent negative sentiment
        if context.sentiment_trend:
            recent_sentiment = context.sentiment_trend[-3:]  # Last 3 sentiment points
            negative_sentiment_count = sum(1 for _, sentiment in recent_sentiment 
                                         if sentiment in [SentimentLevel.NEGATIVE, SentimentLevel.VERY_NEGATIVE])
            if negative_sentiment_count >= 2:
                urgency += 0.2
        
        return min(urgency, 1.0)
    
    def _calculate_complexity_score(self, context: ConversationContext) -> float:
        """Calculate complexity score based on conversation factors."""
        complexity = 0.0
        
        # Multiple objections increase complexity
        complexity += min(len(context.detected_objections) * 0.2, 0.4)
        
        # Multiple topics increase complexity
        complexity += min(len(context.key_topics) * 0.1, 0.3)
        
        # Long conversations are more complex
        if context.duration_minutes > 30:
            complexity += 0.2
        elif context.duration_minutes > 60:
            complexity += 0.3
        
        # Advanced sales stages are more complex
        if context.current_stage in [SalesStage.NEGOTIATION, SalesStage.PROPOSAL]:
            complexity += 0.2
        
        return min(complexity, 1.0)
    
    def _generate_conversation_summary(self, context: ConversationContext) -> str:
        """Generate brief conversation summary."""
        summary_parts = [
            f"Sales conversation in {context.current_stage.value} stage",
            f"Duration: {context.duration_minutes} minutes"
        ]
        
        if context.key_topics:
            summary_parts.append(f"Topics: {', '.join(context.key_topics[:3])}")
        
        if context.detected_objections:
            summary_parts.append(f"Objections: {', '.join(context.detected_objections)}")
        
        if context.buying_signals:
            summary_parts.append(f"Buying signals: {', '.join(context.buying_signals)}")
        
        return ". ".join(summary_parts)
    
    def _predict_next_actions(self, context: ConversationContext) -> List[str]:
        """Predict next best actions based on conversation context."""
        actions = []
        
        # Stage-specific actions
        stage_actions = {
            SalesStage.DISCOVERY: [
                "Ask open-ended questions about pain points",
                "Explore budget and decision-making process",
                "Understand current solutions and gaps"
            ],
            SalesStage.DEMO: [
                "Focus on features that address identified needs",
                "Get confirmation on value proposition",
                "Ask for specific feedback on demonstration"
            ],
            SalesStage.OBJECTION_HANDLING: [
                "Acknowledge the concern fully",
                "Ask clarifying questions",
                "Provide evidence or social proof"
            ],
            SalesStage.CLOSING: [
                "Summarize agreed value points",
                "Ask for commitment or next steps",
                "Address any final concerns"
            ]
        }
        
        actions.extend(stage_actions.get(context.current_stage, []))
        
        # Context-specific actions
        if context.buying_signals:
            actions.append("Ask for the sale - strong buying signals detected")
        
        if context.detected_objections:
            actions.append("Address objections with empathy and evidence")
        
        if context.urgency_score > 0.7:
            actions.append("Take immediate action - high urgency situation")
        
        return actions[:5]  # Return top 5 actions
    
    def _initialize_conversation_context(
        self,
        conversation_id: str,
        start_time: datetime,
        first_speaker: str
    ) -> ConversationContext:
        """Initialize new conversation context."""
        
        # Determine participant roles based on first speaker
        participant_roles = {first_speaker: "salesperson"}
        if first_speaker == "salesperson":
            participant_roles["prospect"] = "prospect"
        else:
            participant_roles["salesperson"] = "salesperson"
        
        return ConversationContext(
            conversation_id=conversation_id,
            start_time=start_time,
            duration_minutes=0,
            current_stage=SalesStage.DISCOVERY,  # Default starting stage
            participant_roles=participant_roles,
            recent_turns=[],
            conversation_summary="",
            key_topics=[],
            detected_objections=[],
            buying_signals=[],
            sentiment_trend=[],
            next_best_actions=[],
            urgency_score=0.0,
            complexity_score=0.0
        )
    
    def _initialize_stage_keywords(self) -> Dict[str, List[str]]:
        """Initialize keywords for sales stage detection."""
        return {
            "prospecting": [
                "cold call", "introduction", "referred by", "mutual connection",
                "research", "company background", "initial contact"
            ],
            "discovery": [
                "pain point", "challenge", "problem", "current situation",
                "goals", "objectives", "ideal solution", "budget", "timeline",
                "decision maker", "process", "criteria"
            ],
            "demo": [
                "demonstration", "show you", "walk through", "features",
                "capabilities", "how it works", "screen share", "example"
            ],
            "proposal": [
                "proposal", "quote", "pricing", "package", "options",
                "recommendation", "solution design", "implementation"
            ],
            "objection_handling": [
                "concern", "worried", "not sure", "hesitant", "doubt",
                "problem with", "issue", "but", "however"
            ],
            "negotiation": [
                "negotiate", "discount", "better price", "terms", "contract",
                "agreement", "concession", "deal", "final offer"
            ],
            "closing": [
                "decision", "move forward", "get started", "sign",
                "agree", "commitment", "next steps", "onboarding"
            ]
        }
    
    def _initialize_objection_patterns(self) -> Dict[str, List[str]]:
        """Initialize patterns for objection detection."""
        return {
            "price_objection": [
                "too expensive", "cost too much", "budget", "can't afford",
                "price is high", "over budget", "cheaper option"
            ],
            "timing_objection": [
                "not the right time", "maybe later", "too busy", "timing",
                "revisit next", "not ready", "wait until"
            ],
            "authority_objection": [
                "need to check with", "talk to my", "boss decides",
                "not my decision", "committee", "board approval"
            ],
            "need_objection": [
                "don't need", "working fine", "happy with current",
                "not a priority", "don't see the value"
            ],
            "trust_objection": [
                "never heard of", "not sure about", "concerned about",
                "worried about", "risky", "proven track record"
            ]
        }
    
    def _initialize_buying_signal_patterns(self) -> Dict[str, List[str]]:
        """Initialize patterns for buying signal detection."""
        return {
            "interest_signal": [
                "tell me more", "how does", "what if", "can you",
                "interested in", "sounds good", "that's helpful"
            ],
            "timeline_signal": [
                "when can we", "how long", "timeline", "start date",
                "implementation", "go live", "launch"
            ],
            "budget_signal": [
                "what's the cost", "pricing", "investment", "budget",
                "financial", "ROI", "payback"
            ],
            "decision_signal": [
                "let's do it", "sounds like a plan", "next steps",
                "move forward", "get started", "make sense"
            ],
            "urgency_signal": [
                "need this soon", "urgent", "asap", "quickly",
                "deadline", "time sensitive", "right away"
            ]
        }
    
    def _initialize_sentiment_indicators(self) -> Dict[str, List[str]]:
        """Initialize sentiment analysis indicators."""
        return {
            "positive": [
                "great", "excellent", "love", "perfect", "amazing",
                "fantastic", "wonderful", "impressed", "excited", "happy"
            ],
            "negative": [
                "terrible", "awful", "hate", "horrible", "disappointed",
                "frustrated", "angry", "concerned", "worried", "problem"
            ]
        }
    
    def _initialize_intent_patterns(self) -> Dict[str, List[str]]:
        """Initialize intent classification patterns."""
        return {
            "question": ["?", "how", "what", "when", "where", "why", "can you"],
            "request": ["please", "could you", "would you", "can you show"],
            "objection": ["but", "however", "concern", "worried", "not sure"],
            "agreement": ["yes", "okay", "sure", "sounds good", "I agree"],
            "disagreement": ["no", "don't think", "not convinced", "disagree"]
        }
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get conversation analyzer performance statistics."""
        avg_analysis_time = sum(self.analysis_times) / len(self.analysis_times) if self.analysis_times else 0
        
        return {
            "performance": {
                "avg_analysis_time_ms": round(avg_analysis_time, 2),
                "target_analysis_time_ms": 500,
                "performance_status": "✅ OPTIMAL" if avg_analysis_time < 500 else "⚠️ NEEDS OPTIMIZATION",
                "total_analyses": len(self.analysis_times)
            },
            "active_conversations": len(self.active_conversations),
            "methodology_coverage": {
                "sales_stages": len(self.stage_keywords),
                "objection_types": len(self.objection_patterns),
                "buying_signal_types": len(self.buying_signal_patterns)
            }
        }


# Global instance for VoiceCoach application
conversation_analyzer = ConversationAnalyzer()