/**
 * VoiceCoach V2 - Questionnaire Types
 * Type definitions for knowledge base questionnaire
 */

export interface QuestionnaireAnswers {
  q1_docType: string;
  q2_learningObjective: string;
  q3_businessChallenge: string;
  q4_successMetrics: string;
  q5_criticalConcepts: string[];
}

export interface QuestionnaireState {
  currentQuestion: number;
  answers: QuestionnaireAnswers;
  selectedFiles: string[];
  isComplete: boolean;
}

export type QuestionStatus = 'current' | 'completed' | 'pending';

export interface QuestionConfig {
  id: number;
  title: string;
  description?: string;
  type: 'radio' | 'textarea' | 'text' | 'multi-text';
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  placeholder?: string;
  required?: boolean;
}