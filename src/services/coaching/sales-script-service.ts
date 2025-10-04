/**
 * VoiceCoach V2 - Sales Script Service
 * Manages sales scripts, loads structured script data, and provides script context
 * Enables script-aware coaching by tracking conversation against predefined sales flows
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export interface ScriptStage {
  number: number;
  name: string;
  title: string;
  objective: string;
  keyPhrases: string[];
  detectionPhrases: string[];
  toolWeights: Record<string, number>;
  mefsFocus: Array<'mental' | 'emotional' | 'financial' | 'schedule'>;
  languageRules: Record<string, boolean>;
  examples?: Record<string, any>;
  transition?: {
    tool: string;
    phrase: string;
  };
  placeholders?: Record<string, string>;
}

export interface SalesScript {
  id: string;
  name: string;
  description: string;
  price?: string;
  duration?: string;
  stages: ScriptStage[];
  globalRules: {
    earlyStages: { stages: number[]; rules: Record<string, boolean> };
    middleStages: { stages: number[]; rules: Record<string, boolean> };
    lateStages: { stages: number[]; rules: Record<string, boolean> };
  };
  transitions?: Record<string, string>;
  customization?: {
    instructions: string;
    requiredFields: string[];
    optionalFields: string[];
  };
}

export interface ScriptProgress {
  currentStage: number;
  stageCompletion: number; // 0-100%
  overallProgress: number; // 0-100%
  missedTransitions: string[];
  adherenceScore: number; // 0-100%
  nextSuggestedAction: string;
}

export class SalesScriptService {
  private trail: BreadcrumbTrail;
  private availableScripts: Map<string, SalesScript> = new Map();
  private currentScript: SalesScript | null = null;
  private progress: ScriptProgress | null = null;

  constructor() {
    this.trail = new BreadcrumbTrail('SalesScriptService');
    this.trail.light(9400, {
      operation: 'sales_script_service_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Initialize service by loading available scripts
   */
  async initialize(): Promise<boolean> {
    try {
      this.trail.light(9401, {
        operation: 'script_service_initialization_start'
      });

      // Load built-in scripts
      await this.loadBuiltInScripts();

      this.trail.light(9402, {
        operation: 'script_service_initialization_complete',
        availableScripts: this.availableScripts.size
      });

      return true;
    } catch (error) {
      this.trail.fail(8401, error as Error);
      return false;
    }
  }

  /**
   * Load built-in scripts from Sales folder
   */
  private async loadBuiltInScripts(): Promise<void> {
    try {
      // Get list of available scripts from Electron IPC
      if (window.electronAPI?.listSalesScripts) {
        const scriptFiles = await window.electronAPI.listSalesScripts();
        console.log(`🎵 LED 9402: Found ${scriptFiles.length} sales scripts`);

        for (const scriptFile of scriptFiles) {
          try {
            const response = await fetch(scriptFile.path);
            if (response.ok) {
              const script: SalesScript = await response.json();
              this.availableScripts.set(script.id, script);
              console.log(`✅ Loaded script: ${script.name} (${scriptFile.name})`);
            }
          } catch (err) {
            console.warn(`⚠️ Could not load ${scriptFile.name}:`, err);
          }
        }

        this.trail.light(9403, {
          operation: 'builtin_scripts_loaded',
          scripts: Array.from(this.availableScripts.keys())
        });
      } else {
        // Fallback to embedded script data if Electron API not available
        console.warn('Electron API not available, using embedded scripts');
        this.loadEmbeddedScripts();
      }

    } catch (error) {
      console.warn('Could not load built-in scripts, using embedded data:', error);
      // Fallback to embedded script data
      this.loadEmbeddedScripts();
    }
  }

  /**
   * Fallback to embedded script data if file loading fails
   */
  private loadEmbeddedScripts(): void {
    // Golf coaching script (simplified version)
    const golfScript: SalesScript = {
      id: 'golf-coaching-6k',
      name: 'Golf Coaching Package ($6,000/year)',
      description: 'Professional golf coaching package sales script',
      price: '$6,124',
      duration: '1 year',
      stages: [
        {
          number: 1,
          name: 'Rapport',
          title: 'Lay a foundation for roles and who I am',
          objective: 'Build trust and connection',
          keyPhrases: ['tell me about your golf game', 'certified golf coaching specialist'],
          detectionPhrases: ['thanks for taking the time', 'my role here is to listen'],
          toolWeights: { mirroring: 0.5, proactiveValidation: 0.15, calibratedQuestions: 0.25, weNotI: 0.1 },
          mefsFocus: ['mental', 'emotional'],
          languageRules: { useWe: true, avoidPressure: true, buildTrust: true }
        },
        {
          number: 2,
          name: 'Problem Intro',
          title: 'Why are we talking?',
          objective: 'Introduce common pain points',
          keyPhrases: ['frustrated with inconsistent swings', 'mental blocks'],
          detectionPhrases: ['many golfers like you', 'these issues can make golf'],
          toolWeights: { mirroring: 0.4, emotionalResponseValidation: 0.3, calibratedQuestions: 0.2, weNotI: 0.1 },
          mefsFocus: ['mental', 'emotional'],
          languageRules: { useWe: true, focusOnPain: true, validateEmotions: true }
        }
        // Additional stages would be loaded from full JSON
      ],
      globalRules: {
        earlyStages: { stages: [1, 2, 3, 4], rules: { alwaysUseWe: true, avoidTakeAway: true } },
        middleStages: { stages: [5, 6, 7], rules: { introduceNoMeansYes: true, addressAllMEFS: true } },
        lateStages: { stages: [8, 9], rules: { allowTakeAway: true, beAssertive: true } }
      }
    };

    this.availableScripts.set(golfScript.id, golfScript);

    this.trail.light(9404, {
      operation: 'embedded_scripts_loaded',
      count: this.availableScripts.size
    });
  }

  /**
   * Get list of available scripts
   */
  getAvailableScripts(): SalesScript[] {
    return Array.from(this.availableScripts.values());
  }

  /**
   * Set the active script for coaching
   */
  setActiveScript(scriptId: string): boolean {
    const script = this.availableScripts.get(scriptId);
    if (!script) {
      this.trail.fail(8402, new Error(`Script not found: ${scriptId}`));
      return false;
    }

    this.currentScript = script;
    this.resetProgress();

    this.trail.light(9405, {
      operation: 'active_script_set',
      scriptId,
      scriptName: script.name,
      stages: script.stages.length
    });

    return true;
  }

  /**
   * Get the currently active script
   */
  getCurrentScript(): SalesScript | null {
    return this.currentScript;
  }

  /**
   * Get script stage by number
   */
  getStage(stageNumber: number): ScriptStage | null {
    if (!this.currentScript) return null;
    return this.currentScript.stages.find(stage => stage.number === stageNumber) || null;
  }

  /**
   * Get current script progress
   */
  getProgress(): ScriptProgress | null {
    return this.progress;
  }

  /**
   * Update script progress based on conversation analysis
   */
  updateProgress(
    detectedStage: number,
    completionPercentage: number,
    missedElements: string[] = []
  ): void {
    if (!this.currentScript) return;

    const totalStages = this.currentScript.stages.length;
    const overallProgress = ((detectedStage - 1) / (totalStages - 1)) * 100;

    // Calculate adherence score (100% - penalty for missed elements)
    const adherenceScore = Math.max(0, 100 - (missedElements.length * 10));

    const nextStage = this.getStage(detectedStage + 1);
    const nextAction = nextStage
      ? `Move to ${nextStage.name}: ${nextStage.objective}`
      : 'Complete the sale';

    this.progress = {
      currentStage: detectedStage,
      stageCompletion: completionPercentage,
      overallProgress: Math.min(100, overallProgress),
      missedTransitions: missedElements,
      adherenceScore,
      nextSuggestedAction: nextAction
    };

    this.trail.light(9406, {
      operation: 'script_progress_updated',
      currentStage: detectedStage,
      completion: completionPercentage,
      adherence: adherenceScore,
      missedElements: missedElements.length
    });
  }

  /**
   * Reset progress for new conversation
   */
  resetProgress(): void {
    this.progress = {
      currentStage: 1,
      stageCompletion: 0,
      overallProgress: 0,
      missedTransitions: [],
      adherenceScore: 100,
      nextSuggestedAction: this.currentScript?.stages[0]?.objective || 'Begin rapport building'
    };

    this.trail.light(9407, {
      operation: 'script_progress_reset',
      timestamp: Date.now()
    });
  }

  /**
   * Get tool weights for current stage
   */
  getCurrentStageToolWeights(): Record<string, number> {
    if (!this.currentScript || !this.progress) {
      return {};
    }

    const currentStage = this.getStage(this.progress.currentStage);
    return currentStage?.toolWeights || {};
  }

  /**
   * Get MEFS focus for current stage
   */
  getCurrentStageMEFSFocus(): Array<'mental' | 'emotional' | 'financial' | 'schedule'> {
    if (!this.currentScript || !this.progress) {
      return ['mental', 'emotional'];
    }

    const currentStage = this.getStage(this.progress.currentStage);
    return currentStage?.mefsFocus || ['mental', 'emotional'];
  }

  /**
   * Get language rules for current stage
   */
  getCurrentStageLanguageRules(): Record<string, boolean> {
    if (!this.currentScript || !this.progress) {
      return { useWe: true };
    }

    const currentStage = this.getStage(this.progress.currentStage);
    const stageRules = currentStage?.languageRules || {};

    // Apply global rules based on stage number
    const stageNumber = this.progress.currentStage;
    const globalRules = this.currentScript.globalRules;

    let applicableGlobalRules = {};
    if (globalRules.earlyStages.stages.includes(stageNumber)) {
      applicableGlobalRules = globalRules.earlyStages.rules;
    } else if (globalRules.middleStages.stages.includes(stageNumber)) {
      applicableGlobalRules = globalRules.middleStages.rules;
    } else if (globalRules.lateStages.stages.includes(stageNumber)) {
      applicableGlobalRules = globalRules.lateStages.rules;
    }

    return { ...applicableGlobalRules, ...stageRules };
  }

  /**
   * Check if a tool is appropriate for current stage
   */
  isToolAppropriate(toolName: string): boolean {
    const rules = this.getCurrentStageLanguageRules();
    const toolWeights = this.getCurrentStageToolWeights();

    // Check explicit restrictions
    if (toolName === 'takeAway' && rules.avoidTakeAway) {
      return false;
    }

    if (toolName === 'noMeansYes' && !rules.introduceNoMeansYes && !rules.allowTakeAway) {
      return false;
    }

    // Check if tool has weight > 0 for this stage
    const weight = toolWeights[toolName] || 0;
    return weight > 0;
  }

  /**
   * Get transition phrase for moving to next stage
   */
  getTransitionPhrase(fromStage: number, toStage: number): string | null {
    if (!this.currentScript?.transitions) return null;

    const transitionKey = `${fromStage}to${toStage}`;
    return this.currentScript.transitions[transitionKey] || null;
  }

  /**
   * Get examples for current stage and tool
   */
  getStageExamples(toolName: string): any | null {
    if (!this.currentScript || !this.progress) return null;

    const currentStage = this.getStage(this.progress.currentStage);
    return currentStage?.examples?.[toolName] || null;
  }

  /**
   * Load custom script from user data
   */
  async loadCustomScript(scriptData: any): Promise<boolean> {
    try {
      // Validate script data structure
      if (!this.validateScriptStructure(scriptData)) {
        throw new Error('Invalid script structure');
      }

      const script: SalesScript = scriptData;
      this.availableScripts.set(script.id, script);

      this.trail.light(9408, {
        operation: 'custom_script_loaded',
        scriptId: script.id,
        scriptName: script.name
      });

      return true;
    } catch (error) {
      this.trail.fail(8403, error as Error);
      return false;
    }
  }

  /**
   * Validate script structure
   */
  private validateScriptStructure(scriptData: any): boolean {
    try {
      return (
        scriptData.id &&
        scriptData.name &&
        scriptData.stages &&
        Array.isArray(scriptData.stages) &&
        scriptData.stages.length > 0 &&
        scriptData.stages.every((stage: any) =>
          stage.number &&
          stage.name &&
          stage.toolWeights &&
          stage.mefsFocus
        )
      );
    } catch {
      return false;
    }
  }

  /**
   * Export current script data
   */
  exportScript(): SalesScript | null {
    return this.currentScript;
  }

  /**
   * Get service status
   */
  getStatus(): {
    isInitialized: boolean;
    availableScripts: number;
    currentScript: string | null;
    progress: ScriptProgress | null;
  } {
    return {
      isInitialized: this.availableScripts.size > 0,
      availableScripts: this.availableScripts.size,
      currentScript: this.currentScript?.name || null,
      progress: this.progress
    };
  }
}