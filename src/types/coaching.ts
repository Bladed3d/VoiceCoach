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
}

export interface TranscriptionItem {
  id: number;
  speaker: 'user' | 'prospect' | 'unknown';
  text: string;
  timestamp: number;
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

export interface SessionState {
  isRecording: boolean;
  wsStatus: string;
  ollamaStatus?: string;
  sessionData: SessionData;
  coachingPrompts: CoachingPrompt[];
  transcriptions: TranscriptionItem[];
  liveTranscript: string;
  volumeState?: VolumeState; // Legacy single volume state
  micVolumeState?: VolumeState; // Microphone volume
  tabVolumeState?: VolumeState; // Tab/headphone volume
  captureMode?: 'microphone' | 'full-conversation'; // Audio capture mode
}