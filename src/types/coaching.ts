/**
 * VoiceCoach V2 - Core Coaching Types
 * Centralized type definitions for coaching functionality
 */

export interface SessionData {
  duration: number;
  stage: string;
  prompts: number;
  talkRatio: {
    user: number;
    prospect: number;
  };
  responseTime: string;
  effectiveness: number;
}

export interface CoachingPrompt {
  id: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  text: string;
  category: string;
  trigger: string;
  context: string;
  timestamp: number;
  stageId?: string; // [Stage.Prompt.Transcript] numbering
}

export interface TranscriptionItem {
  id: number;
  speaker: 'user' | 'prospect' | 'unknown';
  text: string;
  timestamp: number;
  stageId?: string; // [Stage.Prompt.Transcript] numbering
}

export interface VolumeState {
  level: number;
  isMonitoring: boolean;
  status: 'good' | 'low' | 'silent';
}

export interface SalesScriptItem {
  id: string;
  title: string;
  content: string;
  category: 'opening' | 'presentation' | 'objection' | 'closing' | 'discovery' | 'general';
  notes?: string;
  used: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface PanelState {
  isCollapsed: boolean;
  isHidden: boolean; // New: completely hidden from view
  width: number;
  minWidth: number;
  maxWidth: number;
}

export interface SentimentData {
  score: number;              // -100 to +100 (-100 = very negative, +100 = very positive)
  direction: 'positive' | 'negative' | 'neutral';
  confidence: number;         // 0-100% confidence in analysis
  engagement: 'high' | 'medium' | 'low';
  trend: 'improving' | 'declining' | 'stable';
  timestamp: number;
}

export interface ManualSentiment {
  timestamp: number;
  score: -50 | -25 | 0 | 25 | 50;
  transcriptIndex: number;    // Link to specific transcript
  emoji: string;              // Visual representation
}

export interface SessionState {
  isRecording: boolean;
  wsStatus: string;
  ollamaStatus?: string;
  sessionData: SessionData;
  coachingPrompts: CoachingPrompt[];
  transcriptions: TranscriptionItem[];
  liveTranscript: string;
  liveTranscriptSpeaker?: 'user' | 'prospect'; // Real-time speaker context for live transcripts
  volumeState?: VolumeState; // Legacy single volume state
  micVolumeState?: VolumeState; // Microphone volume
  tabVolumeState?: VolumeState; // Tab/headphone volume
  captureMode?: 'microphone' | 'full-conversation'; // Audio capture mode
  currentSentiment?: SentimentData; // Current prospect sentiment
  manualSentiments?: ManualSentiment[]; // User's manual sentiment inputs
  currentManualSentiment?: number; // Most recent manual sentiment score
}