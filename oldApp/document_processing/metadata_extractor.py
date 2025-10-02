"""
VoiceCoach Metadata Extraction Engine
Advanced metadata extraction and classification for sales documents
"""

import re
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import json

logger = logging.getLogger(__name__)

@dataclass
class ExtractedMetadata:
    """Structured metadata extracted from sales documents"""
    document_type: str
    sales_methodology: Optional[str]
    target_audience: List[str]
    objection_types: List[str]
    sales_stage: Optional[str]
    difficulty_level: str
    key_topics: List[str]
    actionable_items: List[str]
    training_category: str
    confidence_score: float
    extracted_entities: Dict[str, List[str]]

class MetadataExtractor:
    """
    Advanced metadata extraction system for VoiceCoach sales documents.
    
    Extracts and classifies:
    - Document types and sales methodologies
    - Target audiences and personas
    - Objection types and handling strategies
    - Sales stages and process steps
    - Training categories and difficulty levels
    - Key topics and actionable items
    """
    
    # Sales methodology patterns
    METHODOLOGIES = {
        'SPIN': [
            'situation questions', 'problem questions', 'implication questions', 
            'need payoff', 'spin selling', 'neil rackham'
        ],
        'MEDDIC': [
            'metrics', 'economic buyer', 'decision criteria', 'decision process',
            'identify pain', 'champion', 'meddic', 'meddpicc'
        ],
        'Challenger': [
            'challenge customer', 'teach insight', 'tailor message', 'take control',
            'challenger sale', 'commercial insight', 'rational drowning'
        ],
        'Sandler': [
            'pain funnel', 'up front contract', 'sandler rule', 'negative reverse',
            'sandler selling', 'david sandler', 'submarine'
        ],
        'BANT': [
            'budget authority need timeline', 'budget', 'authority', 'need', 'timeline',
            'qualified lead', 'bant criteria'
        ],
        'Solution Selling': [
            'solution selling', 'pain sheet', 'value proposition', 'compelling event',
            'buying facilitation', 'consultative selling'
        ]
    }
    
    # Document type patterns
    DOCUMENT_TYPES = {
        'objection_handling': [
            'objection', 'pushback', 'concern', 'resistance', 'how to handle',
            'response to', 'overcoming', 'addressing concerns'
        ],
        'sales_script': [
            'script', 'call script', 'talk track', 'conversation flow',
            'dialogue', 'phone script', 'what to say'
        ],
        'product_knowledge': [
            'product features', 'benefits', 'specifications', 'datasheet',
            'product guide', 'technical specs', 'feature comparison'
        ],
        'pricing_guide': [
            'pricing', 'cost', 'investment', 'package', 'tier', 'subscription',
            'pricing strategy', 'discount', 'negotiation'
        ],
        'competitor_analysis': [
            'competitor', 'competition', 'versus', 'battle card', 'competitive',
            'against', 'comparison', 'alternative'
        ],
        'case_study': [
            'case study', 'success story', 'customer story', 'testimonial',
            'result', 'outcome', 'roi', 'achievement'
        ],
        'sales_process': [
            'sales process', 'methodology', 'framework', 'approach', 'strategy',
            'workflow', 'procedure', 'step by step'
        ],
        'proposal_template': [
            'proposal', 'template', 'contract', 'agreement', 'quote',
            'estimate', 'scope of work', 'statement of work'
        ]
    }
    
    # Objection type patterns
    OBJECTION_TYPES = {
        'price_objections': [
            'too expensive', 'cost too much', 'budget', 'price', 'afford',
            'cheaper alternative', 'investment', 'roi'
        ],
        'authority_objections': [
            'need to check', 'not my decision', 'boss decides', 'committee',
            'need approval', 'decision maker', 'authority'
        ],
        'need_objections': [
            'not interested', 'no need', 'happy with current', 'already have',
            'satisfied', 'working fine', 'no problem'
        ],
        'timing_objections': [
            'not ready', 'maybe later', 'next quarter', 'think about it',
            'timing', 'schedule', 'delay', 'postpone'
        ],
        'trust_objections': [
            'never heard of', 'trust', 'reputation', 'references', 'proof',
            'credibility', 'track record', 'experience'
        ],
        'feature_objections': [
            'missing feature', 'doesn\'t do', 'limitation', 'requirement',
            'functionality', 'capability', 'integration'
        ]
    }
    
    # Sales stage indicators
    SALES_STAGES = {
        'prospecting': [
            'cold call', 'outreach', 'prospecting', 'lead generation',
            'qualifying', 'initial contact', 'introduction'
        ],
        'discovery': [
            'discovery', 'needs analysis', 'pain points', 'current situation',
            'challenges', 'goals', 'requirements'
        ],
        'presentation': [
            'presentation', 'demo', 'proposal', 'solution', 'pitch',
            'showcase', 'feature walk', 'product tour'
        ],
        'handling_objections': [
            'objection', 'concern', 'pushback', 'resistance', 'hesitation',
            'doubt', 'question', 'clarification'
        ],
        'closing': [
            'closing', 'decision', 'next steps', 'agreement', 'contract',
            'signature', 'purchase', 'commitment'
        ],
        'follow_up': [
            'follow up', 'check in', 'status', 'update', 'progress',
            'relationship', 'ongoing', 'retention'
        ]
    }
    
    # Target audience patterns
    TARGET_AUDIENCES = {
        'new_salespeople': [
            'new', 'beginner', 'junior', 'entry level', 'first time',
            'novice', 'getting started', 'basics'
        ],
        'experienced_salespeople': [
            'experienced', 'senior', 'advanced', 'veteran', 'expert',
            'seasoned', 'professional', 'skilled'
        ],
        'sales_managers': [
            'manager', 'leader', 'supervisor', 'director', 'team lead',
            'coaching', 'management', 'leadership'
        ],
        'technical_sales': [
            'technical', 'engineer', 'solution consultant', 'pre sales',
            'technical sales', 'solutions engineer', 'architect'
        ],
        'inside_sales': [
            'inside sales', 'telephone', 'phone sales', 'remote',
            'inbound', 'call center', 'telesales'
        ],
        'field_sales': [
            'field sales', 'outside sales', 'territory', 'face to face',
            'in person', 'on site', 'field'
        ]
    }
    
    def __init__(self):
        """Initialize metadata extractor with pattern matching engines"""
        self.compiled_patterns = self._compile_patterns()
    
    def _compile_patterns(self) -> Dict[str, Dict[str, re.Pattern]]:
        """Compile regex patterns for efficient matching"""
        compiled = {}
        
        pattern_groups = {
            'methodologies': self.METHODOLOGIES,
            'document_types': self.DOCUMENT_TYPES,
            'objection_types': self.OBJECTION_TYPES,
            'sales_stages': self.SALES_STAGES,
            'target_audiences': self.TARGET_AUDIENCES
        }
        
        for group_name, patterns in pattern_groups.items():
            compiled[group_name] = {}
            for category, keywords in patterns.items():
                pattern = '|'.join(re.escape(keyword) for keyword in keywords)
                compiled[group_name][category] = re.compile(pattern, re.IGNORECASE)
        
        return compiled
    
    def extract_metadata(self, content: str, document_metadata: Dict[str, Any]) -> ExtractedMetadata:
        """
        Extract comprehensive metadata from sales document content.
        
        Args:
            content: Document text content
            document_metadata: Basic document metadata (filename, size, etc.)
            
        Returns:
            ExtractedMetadata with detailed classification and analysis
        """
        
        content_lower = content.lower()
        
        # Extract each metadata component
        document_type = self._classify_document_type(content_lower)
        sales_methodology = self._identify_sales_methodology(content_lower)
        target_audience = self._identify_target_audience(content_lower)
        objection_types = self._identify_objection_types(content_lower)
        sales_stage = self._identify_sales_stage(content_lower)
        difficulty_level = self._assess_difficulty_level(content, document_metadata)
        key_topics = self._extract_key_topics(content)
        actionable_items = self._extract_actionable_items(content)
        training_category = self._classify_training_category(document_type, sales_methodology)
        extracted_entities = self._extract_entities(content)
        
        # Calculate confidence score
        confidence_score = self._calculate_confidence_score(
            document_type, sales_methodology, target_audience, objection_types
        )
        
        return ExtractedMetadata(
            document_type=document_type,
            sales_methodology=sales_methodology,
            target_audience=target_audience,
            objection_types=objection_types,
            sales_stage=sales_stage,
            difficulty_level=difficulty_level,
            key_topics=key_topics,
            actionable_items=actionable_items,
            training_category=training_category,
            confidence_score=confidence_score,
            extracted_entities=extracted_entities
        )
    
    def _classify_document_type(self, content_lower: str) -> str:
        """Classify the type of sales document"""
        type_scores = {}
        
        for doc_type, pattern in self.compiled_patterns['document_types'].items():
            matches = len(pattern.findall(content_lower))
            type_scores[doc_type] = matches
        
        # Return highest scoring type, or 'general_sales' if no strong matches
        if type_scores and max(type_scores.values()) > 0:
            return max(type_scores.items(), key=lambda x: x[1])[0]
        else:
            return 'general_sales'
    
    def _identify_sales_methodology(self, content_lower: str) -> Optional[str]:
        """Identify primary sales methodology mentioned in content"""
        methodology_scores = {}
        
        for methodology, pattern in self.compiled_patterns['methodologies'].items():
            matches = len(pattern.findall(content_lower))
            if matches > 0:
                methodology_scores[methodology] = matches
        
        if methodology_scores:
            return max(methodology_scores.items(), key=lambda x: x[1])[0]
        else:
            return None
    
    def _identify_target_audience(self, content_lower: str) -> List[str]:
        """Identify target audiences for the sales content"""
        audiences = []
        
        for audience, pattern in self.compiled_patterns['target_audiences'].items():
            if pattern.search(content_lower):
                audiences.append(audience)
        
        # If no specific audience identified, infer from content complexity
        if not audiences:
            if any(word in content_lower for word in ['basic', 'introduction', 'getting started']):
                audiences.append('new_salespeople')
            elif any(word in content_lower for word in ['advanced', 'complex', 'strategic']):
                audiences.append('experienced_salespeople')
            else:
                audiences.append('general_sales')
        
        return audiences
    
    def _identify_objection_types(self, content_lower: str) -> List[str]:
        """Identify types of objections addressed in the content"""
        objection_types = []
        
        for obj_type, pattern in self.compiled_patterns['objection_types'].items():
            if pattern.search(content_lower):
                objection_types.append(obj_type)
        
        return objection_types
    
    def _identify_sales_stage(self, content_lower: str) -> Optional[str]:
        """Identify primary sales stage focus of the content"""
        stage_scores = {}
        
        for stage, pattern in self.compiled_patterns['sales_stages'].items():
            matches = len(pattern.findall(content_lower))
            if matches > 0:
                stage_scores[stage] = matches
        
        if stage_scores:
            return max(stage_scores.items(), key=lambda x: x[1])[0]
        else:
            return None
    
    def _assess_difficulty_level(self, content: str, document_metadata: Dict[str, Any]) -> str:
        """Assess the difficulty level of the sales content"""
        
        # Complexity indicators
        word_count = len(content.split())
        avg_sentence_length = document_metadata.get('avg_sentence_length', 0)
        technical_terms = self._count_technical_terms(content.lower())
        
        # Calculate complexity score
        complexity_score = 0
        
        # Word count factor
        if word_count > 2000:
            complexity_score += 2
        elif word_count > 1000:
            complexity_score += 1
        
        # Sentence length factor
        if avg_sentence_length > 20:
            complexity_score += 2
        elif avg_sentence_length > 15:
            complexity_score += 1
        
        # Technical terms factor
        if technical_terms > 10:
            complexity_score += 2
        elif technical_terms > 5:
            complexity_score += 1
        
        # Determine difficulty level
        if complexity_score >= 4:
            return 'advanced'
        elif complexity_score >= 2:
            return 'intermediate'
        else:
            return 'beginner'
    
    def _count_technical_terms(self, content_lower: str) -> int:
        """Count technical sales and business terms"""
        technical_terms = [
            'roi', 'tcO', 'saas', 'api', 'crm', 'kpi', 'sla', 'mrr', 'arr',
            'churn', 'ltv', 'cac', 'pipeline', 'forecasting', 'quota',
            'territory', 'vertical', 'enterprise', 'smb', 'mid market'
        ]
        
        count = 0
        for term in technical_terms:
            count += content_lower.count(term)
        
        return count
    
    def _extract_key_topics(self, content: str) -> List[str]:
        """Extract key topics and themes from content"""
        topics = []
        
        # Topic extraction patterns
        topic_patterns = [
            r'(?:about|regarding|concerning)\s+([^.!?]{5,30})',
            r'(?:topic|subject|theme):\s*([^.!?\n]{5,50})',
            r'(?:step|phase|stage)\s+\d+:\s*([^.!?\n]{5,50})',
            r'(?:key|important|critical)\s+([^.!?]{5,30})',
        ]
        
        for pattern in topic_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                clean_topic = match.strip().lower()
                if len(clean_topic) > 5 and clean_topic not in topics:
                    topics.append(clean_topic)
        
        # Extract noun phrases as additional topics
        noun_phrases = self._extract_noun_phrases(content)
        topics.extend(noun_phrases[:5])  # Limit to top 5
        
        return topics[:10]  # Return max 10 topics
    
    def _extract_noun_phrases(self, content: str) -> List[str]:
        """Extract important noun phrases as topics"""
        # Simple noun phrase extraction using patterns
        patterns = [
            r'\b(?:the|a|an)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b',
            r'\b([a-z]+\s+(?:process|method|strategy|approach|technique))\b',
            r'\b([a-z]+\s+(?:objection|concern|question|issue))\b'
        ]
        
        phrases = []
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0] if match[0] else match[1]
                clean_phrase = match.strip().lower()
                if len(clean_phrase) > 5 and clean_phrase not in phrases:
                    phrases.append(clean_phrase)
        
        return phrases
    
    def _extract_actionable_items(self, content: str) -> List[str]:
        """Extract actionable items and recommendations"""
        actionable_items = []
        
        # Action pattern matching
        action_patterns = [
            r'(?:should|must|need to|remember to|always|never)\s+([^.!?\n]{10,80})',
            r'(?:action|step|task):\s*([^.!?\n]{10,80})',
            r'(?:tip|advice|recommendation):\s*([^.!?\n]{10,80})',
            r'(?:do|don\'t|avoid|ensure)\s+([^.!?\n]{10,80})',
        ]
        
        for pattern in action_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                clean_action = match.strip()
                if len(clean_action) > 10 and clean_action not in actionable_items:
                    actionable_items.append(clean_action)
        
        return actionable_items[:8]  # Return max 8 actionable items
    
    def _classify_training_category(self, document_type: str, sales_methodology: Optional[str]) -> str:
        """Classify content into training categories"""
        
        if document_type == 'objection_handling':
            return 'objection_handling'
        elif document_type == 'sales_script':
            return 'communication_skills'
        elif document_type in ['product_knowledge', 'pricing_guide']:
            return 'product_training'
        elif document_type == 'competitor_analysis':
            return 'competitive_intelligence'
        elif document_type == 'case_study':
            return 'success_stories'
        elif document_type == 'sales_process' or sales_methodology:
            return 'sales_methodology'
        else:
            return 'general_sales_skills'
    
    def _extract_entities(self, content: str) -> Dict[str, List[str]]:
        """Extract named entities and structured information"""
        entities = {
            'companies': [],
            'products': [],
            'people': [],
            'numbers': [],
            'percentages': [],
            'currencies': []
        }
        
        # Company patterns
        company_pattern = r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Co))?)\b'
        companies = re.findall(company_pattern, content)
        entities['companies'] = list(set(companies[:10]))
        
        # Product patterns (capitalized terms)
        product_pattern = r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:platform|software|solution|system|tool|product)\b'
        products = re.findall(product_pattern, content)
        entities['products'] = list(set(products[:10]))
        
        # People patterns (Name + title)
        people_pattern = r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:said|explains|recommends|suggests|CEO|CTO|VP|Director|Manager)\b'
        people = re.findall(people_pattern, content)
        entities['people'] = list(set(people[:5]))
        
        # Numbers and metrics
        number_pattern = r'\b(\d+(?:,\d{3})*(?:\.\d+)?)\b'
        numbers = re.findall(number_pattern, content)
        entities['numbers'] = list(set(numbers[:10]))
        
        # Percentages
        percentage_pattern = r'\b(\d+(?:\.\d+)?%)\b'
        percentages = re.findall(percentage_pattern, content)
        entities['percentages'] = list(set(percentages))
        
        # Currency amounts
        currency_pattern = r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
        currencies = re.findall(currency_pattern, content)
        entities['currencies'] = list(set(currencies[:10]))
        
        return entities
    
    def _calculate_confidence_score(self, document_type: str, sales_methodology: Optional[str],
                                  target_audience: List[str], objection_types: List[str]) -> float:
        """Calculate confidence score for metadata extraction"""
        
        score = 0.0
        
        # Document type confidence
        if document_type != 'general_sales':
            score += 0.3
        
        # Sales methodology confidence
        if sales_methodology:
            score += 0.2
        
        # Target audience confidence
        if target_audience and 'general_sales' not in target_audience:
            score += 0.2
        
        # Objection types confidence
        if objection_types:
            score += 0.2
        
        # Base confidence for successful extraction
        score += 0.1
        
        return min(score, 1.0)
    
    def get_metadata_summary(self, metadata: ExtractedMetadata) -> Dict[str, Any]:
        """Generate summary statistics for extracted metadata"""
        
        return {
            'document_type': metadata.document_type,
            'sales_methodology': metadata.sales_methodology,
            'target_audience_count': len(metadata.target_audience),
            'objection_types_count': len(metadata.objection_types),
            'sales_stage': metadata.sales_stage,
            'difficulty_level': metadata.difficulty_level,
            'key_topics_count': len(metadata.key_topics),
            'actionable_items_count': len(metadata.actionable_items),
            'training_category': metadata.training_category,
            'confidence_score': metadata.confidence_score,
            'has_entities': any(metadata.extracted_entities.values()),
            'total_entities': sum(len(v) for v in metadata.extracted_entities.values())
        }