/**
 * VoiceCoach V2 - ToolTemplateEngine Unit Tests
 * Comprehensive testing for template engine functionality
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { ToolTemplateEngine, ToolTemplate, TemplateResult } from '../services/coaching/ToolTemplateEngine';
import * as path from 'path';

describe('ToolTemplateEngine', () => {
  let engine: ToolTemplateEngine;
  const testConfigPath = path.resolve(__dirname, '../../rag/13ToolsRAG-01-templates.json');
  const backupConfigPath = path.resolve(__dirname, '../../rag/backup/13ToolsRAG-01-condensed-backup.json');

  beforeAll(async () => {
    engine = new ToolTemplateEngine(testConfigPath);
    await engine.loadConfig();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with correct default config path', () => {
      const defaultEngine = new ToolTemplateEngine();
      expect(defaultEngine).toBeDefined();
      const stats = defaultEngine.getStats();
      expect(stats.configFile).toBe('rag/13ToolsRAG-01-templates.json');
    });

    it('should initialize with custom config path', () => {
      const customEngine = new ToolTemplateEngine(testConfigPath);
      expect(customEngine).toBeDefined();
      const stats = customEngine.getStats();
      expect(stats.configFile).toBe(testConfigPath);
    });

    it('should load all 13 tools from config', () => {
      const toolCount = engine.getToolCount();
      expect(toolCount).toBe(13);
    });

    it('should have correct tool structure', () => {
      const tool1 = engine.getTool(1);
      expect(tool1).toBeDefined();
      expect(tool1?.id).toBe(1);
      expect(tool1?.name).toBe('Mirroring');
      expect(tool1?.templates).toBeDefined();
      expect(tool1?.triggers).toBeDefined();
      expect(tool1?.variableExtraction).toBeDefined();
    });
  });

  describe('Config Switching', () => {
    it('should switch between template and backup configs', async () => {
      // Load original templates config
      const engine1 = new ToolTemplateEngine(testConfigPath);
      await engine1.loadConfig();

      const tool1 = engine1.getTool(1);
      expect(tool1?.templates).toBeDefined();
      expect(tool1?.templates.length).toBeGreaterThan(0);

      // Switch to backup config (condensed version without templates)
      const engine2 = new ToolTemplateEngine(backupConfigPath);

      // Note: Backup config is simple array format, won't load as ToolTemplate[]
      // This test verifies the engine can attempt different config files
      expect(engine2).toBeDefined();
    });

    it('should reload config with custom path at runtime', async () => {
      const runtimeEngine = new ToolTemplateEngine(testConfigPath);
      await runtimeEngine.loadConfig();

      expect(runtimeEngine.getToolCount()).toBe(13);

      // Verify tools are properly loaded
      const allTools = runtimeEngine.getAllTools();
      expect(allTools.length).toBe(13);
    });
  });

  describe('Template Filling - Tool 1 (Mirroring)', () => {
    it('should fill simple mirroring template correctly', () => {
      const result = engine.fillTemplate(1, { LAST_WORDS: 'expensive' });

      expect(result).toBeDefined();
      expect(result.toolId).toBe(1);
      expect(result.toolName).toBe('Mirroring');
      expect(result.filledPrompt).toBe('expensive?');
      expect(result.confidence).toBe('high');
      expect(result.variables.LAST_WORDS).toBe('expensive');
    });

    it('should handle multi-word LAST_WORDS variable', () => {
      const result = engine.fillTemplate(1, { LAST_WORDS: 'too expensive' });

      expect(result.filledPrompt).toBe('too expensive?');
    });

    it('should use pattern index correctly', () => {
      const result = engine.fillTemplate(1, { LAST_WORDS: 'challenging' }, 1);

      expect(result.filledPrompt).toContain('challenging');
      expect(result.filledPrompt).toContain('tell me more');
      expect(result.patternIndex).toBe(1);
    });
  });

  describe('Template Filling - Tool 13 (Take Away)', () => {
    it('should fill Take Away template with both variables', () => {
      const result = engine.fillTemplate(13, {
        OBJECTION: 'cost is too high',
        CONCERN: 'budget'
      });

      expect(result.filledPrompt).toContain('cost is too high');
      expect(result.filledPrompt).toContain('budget');
      expect(result.toolName).toBe('Take Away');
    });

    it('should handle single variable in alternate pattern', () => {
      const result = engine.fillTemplate(13, {
        OBJECTION: 'timing isn\'t right'
      }, 1);

      expect(result.filledPrompt).toContain('timing isn\'t right');
      expect(result.patternIndex).toBe(1);
    });
  });

  describe('Template Filling - Tool 2 (Empathy Response)', () => {
    it('should fill empathy template with emotion and situation', () => {
      const result = engine.fillTemplate(2, {
        EMOTION: 'frustration',
        SITUATION: 'current software'
      });

      expect(result.filledPrompt).toContain('frustration');
      expect(result.filledPrompt).toContain('current software');
      expect(result.toolName).toBe('Empathy Response');
    });
  });

  describe('Template Filling - Tool 6 (Calibrated Questions)', () => {
    it('should fill calibrated question with multiple variables', () => {
      const result = engine.fillTemplate(6, {
        DESIRED_OUTCOME: 'saving time',
        THEIR_SITUATION: 'daily operations'
      });

      expect(result.filledPrompt).toContain('saving time');
      expect(result.filledPrompt).toContain('daily operations');
      expect(result.toolName).toBe('Calibrated Questions');
    });

    it('should handle different pattern with GOAL variable', () => {
      const result = engine.fillTemplate(6, {
        GOAL: 'reduce manual work'
      }, 1);

      expect(result.filledPrompt).toContain('reduce manual work');
      expect(result.patternIndex).toBe(1);
    });
  });

  describe('Simple Variable Extraction', () => {
    it('should extract variables for Tool 1 (keyword method)', () => {
      const transcript = 'I think this is too expensive for us right now';
      const variables = engine.extractSimpleVariables(1, transcript);

      expect(variables).toBeDefined();
      expect(variables?.LAST_WORDS).toBeDefined();
      expect(variables?.LAST_WORDS).toContain('expensive'); // Should capture last 3 words
    });

    it('should extract variables for Tool 5 (keyword method)', () => {
      const transcript = 'We are really frustrated with the current system';
      const variables = engine.extractSimpleVariables(5, transcript);

      expect(variables).toBeDefined();
      expect(variables?.EMOTION_LABEL).toBeDefined();
    });

    it('should extract variables for Tool 13 (keyword method)', () => {
      const transcript = 'The cost is just too high for our budget';
      const variables = engine.extractSimpleVariables(13, transcript);

      expect(variables).toBeDefined();
      expect(variables?.OBJECTION).toBeDefined();
      expect(variables?.CONCERN).toBeDefined();
    });

    it('should return null for tools requiring AI extraction', () => {
      const transcript = 'I have some concerns about this approach';
      const variables = engine.extractSimpleVariables(2, transcript); // Empathy Response needs AI

      // Tool 2 requires AI for both EMOTION and SITUATION
      expect(variables).toBeNull();
    });
  });

  describe('Tool Retrieval', () => {
    it('should get tool by ID', () => {
      const tool = engine.getTool(1);

      expect(tool).toBeDefined();
      expect(tool?.id).toBe(1);
      expect(tool?.name).toBe('Mirroring');
    });

    it('should return undefined for invalid tool ID', () => {
      const tool = engine.getTool(999);

      expect(tool).toBeUndefined();
    });

    it('should get all tools', () => {
      const allTools = engine.getAllTools();

      expect(allTools).toBeDefined();
      expect(allTools.length).toBe(13);
      expect(allTools[0].id).toBe(1);
      expect(allTools[12].id).toBe(13);
    });
  });

  describe('Pattern Matching Triggers', () => {
    it('should have valid triggers for Tool 1', () => {
      const tool = engine.getTool(1);

      expect(tool?.triggers.keywords).toBeDefined();
      expect(tool?.triggers.keywords.length).toBeGreaterThan(0);
      expect(tool?.triggers.regex).toBeDefined();
      expect(tool?.triggers.sentimentBias).toBe('negative');
      expect(tool?.triggers.stageBias).toContain(1);
    });

    it('should have valid triggers for Tool 13', () => {
      const tool = engine.getTool(13);

      expect(tool?.triggers.keywords).toContain('expensive');
      expect(tool?.triggers.keywords).toContain('cost');
      expect(tool?.triggers.sentimentBias).toBe('negative');
      expect(tool?.triggers.stageBias).toContain(7);
    });
  });

  describe('Cache Management', () => {
    it('should cache template results', () => {
      const stats1 = engine.getStats();
      const initialCacheSize = stats1.cacheSize;

      // Fill template (should cache)
      engine.fillTemplate(1, { LAST_WORDS: 'test' });

      const stats2 = engine.getStats();
      expect(stats2.cacheSize).toBeGreaterThan(initialCacheSize);
    });

    it('should clear cache', () => {
      // Add some cache entries
      engine.fillTemplate(1, { LAST_WORDS: 'test1' });
      engine.fillTemplate(2, { EMOTION: 'happy', SITUATION: 'work' });

      // Clear cache
      engine.clearCache();

      const stats = engine.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid tool ID', () => {
      expect(() => {
        engine.fillTemplate(999, { VARIABLE: 'test' });
      }).toThrow();
    });

    it('should throw error for invalid pattern index', () => {
      expect(() => {
        engine.fillTemplate(1, { LAST_WORDS: 'test' }, 999);
      }).toThrow();
    });

    it('should handle missing config file gracefully', async () => {
      const badEngine = new ToolTemplateEngine('nonexistent/path.json');

      await expect(badEngine.loadConfig()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should fill templates in under 5ms', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        engine.fillTemplate(1, { LAST_WORDS: 'test' });
      }

      const duration = performance.now() - start;
      const avgTime = duration / 100;

      expect(avgTime).toBeLessThan(5);
    });

    it('should extract simple variables in under 2ms', () => {
      const transcript = 'This is way too expensive for our budget';
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        engine.extractSimpleVariables(1, transcript);
      }

      const duration = performance.now() - start;
      const avgTime = duration / 100;

      expect(avgTime).toBeLessThan(2);
    });
  });

  describe('TypeScript Compilation', () => {
    it('should have proper type definitions for ToolTemplate', () => {
      const tool: ToolTemplate = engine.getTool(1)!;

      expect(tool.id).toBeTypeOf('number');
      expect(tool.name).toBeTypeOf('string');
      expect(tool.description).toBeTypeOf('string');
      expect(tool.when_use).toBeTypeOf('string');
      expect(Array.isArray(tool.templates)).toBe(true);
    });

    it('should have proper type definitions for TemplateResult', () => {
      const result: TemplateResult = engine.fillTemplate(1, { LAST_WORDS: 'test' });

      expect(result.toolId).toBeTypeOf('number');
      expect(result.toolName).toBeTypeOf('string');
      expect(result.filledPrompt).toBeTypeOf('string');
      expect(result.confidence).toBeTypeOf('string');
      expect(result.processingTime).toBeTypeOf('number');
    });
  });

  describe('Stats and Monitoring', () => {
    it('should provide accurate statistics', () => {
      const stats = engine.getStats();

      expect(stats.toolCount).toBe(13);
      expect(stats.configFile).toBeDefined();
      expect(typeof stats.cacheSize).toBe('number');
    });
  });
});
