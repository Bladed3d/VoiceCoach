/**
 * useMultiAI Hook - Multi-AI Interface State Management
 * Manages parallel AI queries, responses, and synthesis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AIModel,
  AIModelResponse,
  PromptQuery,
  ProjectContext,
  MyUIConfig,
  SynthesisRequest
} from '../types/myui.types';
import { MultiAIService } from '../services/MultiAIService';
import { ProjectIndexService } from '../services/ProjectIndexService';
import { breadcrumb } from '../../../src/lib/breadcrumbs';

interface UseMultiAIState {
  models: AIModel[];
  currentQuery: PromptQuery | null;
  isQuerying: boolean;
  isSynthesizing: boolean;
  projectContext: ProjectContext | null;
  config: MyUIConfig;
  error: string | null;
}

interface UseMultiAIActions {
  queryMultipleModels: (prompt: string, panelCount?: number) => Promise<void>;
  synthesizeResponses: (synthesisModel: string) => Promise<void>;
  updateProjectContext: () => Promise<void>;
  updateConfig: (newConfig: Partial<MyUIConfig>) => void;
  saveApiKeys: (keys: Record<string, string>) => Promise<void>;
  clearError: () => void;
  clearCurrentQuery: () => void;
}

const DEFAULT_CONFIG: MyUIConfig = {
  selectedModels: ['deepseek-chat', 'claude-3.5-sonnet', 'gpt-4o-mini', 'grok-beta'],
  panelCount: 4,
  autoSynthesize: true,
  contextRetention: true,
  apiKeys: {}
};

export function useMultiAI(): UseMultiAIState & UseMultiAIActions {
  const multiAIService = useRef<MultiAIService>();
  const projectIndexService = useRef<ProjectIndexService>();
  
  const [state, setState] = useState<UseMultiAIState>({
    models: [],
    currentQuery: null,
    isQuerying: false,
    isSynthesizing: false,
    projectContext: null,
    config: DEFAULT_CONFIG,
    error: null
  });

  // Initialize services
  useEffect(() => {
    breadcrumb(7100, 'Initializing useMultiAI hook');
    
    multiAIService.current = new MultiAIService();
    projectIndexService.current = new ProjectIndexService();
    
    // Load initial data
    const initializeData = async () => {
      try {
        const models = multiAIService.current!.getAvailableModels();
        const projectContext = await projectIndexService.current!.loadContext();
        
        setState(prev => ({
          ...prev,
          models,
          projectContext
        }));
        
        breadcrumb(7101, 'useMultiAI hook initialized successfully');
      } catch (error) {
        console.error('Failed to initialize useMultiAI:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize Multi-AI service'
        }));
      }
    };

    initializeData();
  }, []);

  const queryMultipleModels = useCallback(async (
    prompt: string, 
    panelCount: number = state.config.panelCount
  ) => {
    if (!multiAIService.current) return;

    breadcrumb(7110, `Starting multi-model query with ${panelCount} panels`);
    
    setState(prev => ({
      ...prev,
      isQuerying: true,
      error: null
    }));

    try {
      const context = state.config.contextRetention 
        ? await projectIndexService.current?.generateContextForPrompt()
        : undefined;

      const queryResult = await multiAIService.current.queryMultipleModels(
        prompt,
        context,
        panelCount
      );

      setState(prev => ({
        ...prev,
        currentQuery: queryResult,
        isQuerying: false
      }));

      // Auto-synthesize if enabled
      if (state.config.autoSynthesize) {
        await synthesizeResponses('claude-3.5-sonnet');
      }

      breadcrumb(7111, 'Multi-model query completed successfully');
    } catch (error) {
      breadcrumb(7112, `Multi-model query failed: ${error.message}`);
      setState(prev => ({
        ...prev,
        isQuerying: false,
        error: error.message
      }));
    }
  }, [state.config.panelCount, state.config.contextRetention, state.config.autoSynthesize]);

  const synthesizeResponses = useCallback(async (synthesisModel: string) => {
    if (!multiAIService.current || !state.currentQuery) return;

    breadcrumb(7120, 'Starting response synthesis');
    
    setState(prev => ({
      ...prev,
      isSynthesizing: true,
      error: null
    }));

    try {
      const synthesisRequest: SynthesisRequest = {
        responses: state.currentQuery.responses,
        prompt: state.currentQuery.prompt,
        context: state.currentQuery.context,
        synthesisModel
      };

      const synthesis = await multiAIService.current.synthesizeResponses(synthesisRequest);

      setState(prev => ({
        ...prev,
        currentQuery: prev.currentQuery ? {
          ...prev.currentQuery,
          synthesis
        } : null,
        isSynthesizing: false
      }));

      breadcrumb(7121, 'Response synthesis completed');
    } catch (error) {
      breadcrumb(7122, `Response synthesis failed: ${error.message}`);
      setState(prev => ({
        ...prev,
        isSynthesizing: false,
        error: error.message
      }));
    }
  }, [state.currentQuery]);

  const updateProjectContext = useCallback(async () => {
    if (!projectIndexService.current) return;

    breadcrumb(7130, 'Updating project context');

    try {
      const updatedContext = await projectIndexService.current.updateProjectContext();
      
      setState(prev => ({
        ...prev,
        projectContext: updatedContext
      }));

      breadcrumb(7131, 'Project context updated successfully');
    } catch (error) {
      breadcrumb(7132, `Project context update failed: ${error.message}`);
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<MyUIConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  }, []);

  const saveApiKeys = useCallback(async (keys: Record<string, string>) => {
    if (!multiAIService.current) return;

    try {
      await multiAIService.current.saveApiKeys(keys);
      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          apiKeys: { ...prev.config.apiKeys, ...keys }
        }
      }));
      
      breadcrumb(7140, 'API keys saved successfully');
    } catch (error) {
      breadcrumb(7141, `Failed to save API keys: ${error.message}`);
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const clearCurrentQuery = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuery: null
    }));
  }, []);

  return {
    // State
    models: state.models,
    currentQuery: state.currentQuery,
    isQuerying: state.isQuerying,
    isSynthesizing: state.isSynthesizing,
    projectContext: state.projectContext,
    config: state.config,
    error: state.error,

    // Actions
    queryMultipleModels,
    synthesizeResponses,
    updateProjectContext,
    updateConfig,
    saveApiKeys,
    clearError,
    clearCurrentQuery
  };
}