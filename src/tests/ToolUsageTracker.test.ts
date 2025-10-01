/**
 * VoiceCoach V2 - ToolUsageTracker Unit Tests
 * Comprehensive testing for usage tracking and statistics
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ToolUsageTracker, ToolUsageRecord, ToolStatistics } from '../services/coaching/ToolUsageTracker';

describe('ToolUsageTracker', () => {
  let tracker: ToolUsageTracker;

  beforeEach(() => {
    tracker = new ToolUsageTracker('test-session-123');
  });

  describe('Initialization', () => {
    it('should initialize with session ID', () => {
      expect(tracker).toBeDefined();
      const summary = tracker.getSessionSummary();
      expect(summary.sessionId).toBe('test-session-123');
    });

    it('should generate session ID if not provided', () => {
      const autoTracker = new ToolUsageTracker();
      const summary = autoTracker.getSessionSummary();
      expect(summary.sessionId).toContain('session_');
    });

    it('should start with empty usage log', () => {
      expect(tracker.getRecordCount()).toBe(0);
    });
  });

  describe('logToolShown()', () => {
    it('should log when tool is shown', () => {
      tracker.logToolShown(13, 'Take Away', {
        transcript: 'This is expensive',
        sentiment: 'negative',
        stage: 7,
        matchType: 'pattern',
        confidence: 'high'
      });

      expect(tracker.getRecordCount()).toBe(1);
      const records = tracker.getToolRecords(13);
      expect(records.length).toBe(1);
      expect(records[0].eventType).toBe('shown');
      expect(records[0].toolName).toBe('Take Away');
    });

    it('should store context with shown record', () => {
      tracker.logToolShown(1, 'Mirroring', {
        transcript: 'expensive',
        sentiment: 'negative',
        stage: 2,
        matchType: 'pattern',
        confidence: 'high'
      });

      const records = tracker.getToolRecords(1);
      expect(records[0].context.transcript).toBe('expensive');
      expect(records[0].context.sentiment).toBe('negative');
      expect(records[0].context.stage).toBe(2);
      expect(records[0].context.matchType).toBe('pattern');
    });
  });

  describe('logToolUsed()', () => {
    it('should log when tool is used', () => {
      // First show the tool
      tracker.logToolShown(13, 'Take Away', {
        transcript: 'expensive',
        sentiment: 'negative',
        stage: 7
      });

      // Then use it
      tracker.logToolUsed(13, 'Take Away', false);

      const records = tracker.getToolRecords(13);
      expect(records.length).toBe(2);

      const usedRecord = records.find(r => r.eventType === 'used');
      expect(usedRecord).toBeDefined();
      expect(usedRecord?.userAction?.wasUsed).toBe(true);
      expect(usedRecord?.userAction?.wasModified).toBe(false);
    });

    it('should calculate time to action', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });

      // Wait a bit (simulate user thinking)
      setTimeout(() => {
        tracker.logToolUsed(13, 'Take Away', false);

        const records = tracker.getToolRecords(13);
        const usedRecord = records.find(r => r.eventType === 'used');

        expect(usedRecord?.userAction?.timeToDismiss).toBeGreaterThan(0);
      }, 10);
    });

    it('should track modified usage', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', true, 'Modified prompt text');

      const records = tracker.getToolRecords(13);
      const usedRecord = records.find(r => r.eventType === 'used');

      expect(usedRecord?.userAction?.wasModified).toBe(true);
      expect(usedRecord?.userAction?.modifiedText).toBe('Modified prompt text');
    });
  });

  describe('logToolModified()', () => {
    it('should log when tool text is modified', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolModified(
        13,
        'Take Away',
        'Original text here',
        'Modified text here'
      );

      const records = tracker.getToolRecords(13);
      const modifiedRecord = records.find(r => r.eventType === 'modified');

      expect(modifiedRecord).toBeDefined();
      expect(modifiedRecord?.userAction?.wasModified).toBe(true);
      expect(modifiedRecord?.userAction?.modifiedText).toBe('Modified text here');
    });
  });

  describe('logToolDismissed()', () => {
    it('should log when tool is dismissed', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolDismissed(13, 'Take Away');

      const records = tracker.getToolRecords(13);
      const dismissedRecord = records.find(r => r.eventType === 'dismissed');

      expect(dismissedRecord).toBeDefined();
      expect(dismissedRecord?.userAction?.wasUsed).toBe(false);
    });
  });

  describe('getToolStatistics()', () => {
    it('should calculate tool statistics', () => {
      // Simulate multiple interactions
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative', stage: 7 });
      tracker.logToolUsed(13, 'Take Away', false);

      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative', stage: 8 });
      tracker.logToolDismissed(13, 'Take Away');

      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative', stage: 7 });
      tracker.logToolUsed(13, 'Take Away', true, 'modified');

      const stats = tracker.getToolStatistics(13);

      expect(stats).not.toBeNull();
      expect(stats?.toolId).toBe(13);
      expect(stats?.timesShown).toBe(3);
      expect(stats?.timesUsed).toBe(2);
      expect(stats?.timesDismissed).toBe(1);
      expect(stats?.usageRate).toBeCloseTo(2/3, 2);
    });

    it('should calculate modification rate', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolModified(13, 'Take Away', 'original', 'modified');
      tracker.logToolUsed(13, 'Take Away', true, 'modified');

      const stats = tracker.getToolStatistics(13);

      expect(stats?.timesModified).toBe(1);
      expect(stats?.modificationRate).toBeCloseTo(1/2, 2);
    });

    it('should extract common context patterns', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative', stage: 7 });
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative', stage: 7 });
      tracker.logToolShown(13, 'Take Away', { sentiment: 'neutral', stage: 8 });

      const stats = tracker.getToolStatistics(13);

      expect(stats?.contextPatterns.commonSentiments).toContain('negative');
      expect(stats?.contextPatterns.commonStages).toContain(7);
    });

    it('should return null for non-existent tool', () => {
      const stats = tracker.getToolStatistics(999);
      expect(stats).toBeNull();
    });
  });

  describe('getAllToolStatistics()', () => {
    it('should return statistics for all tracked tools', () => {
      tracker.logToolShown(1, 'Mirroring', { sentiment: 'negative' });
      tracker.logToolUsed(1, 'Mirroring', false);

      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      const allStats = tracker.getAllToolStatistics();

      expect(allStats.length).toBe(2);
      expect(allStats.some(s => s.toolId === 1)).toBe(true);
      expect(allStats.some(s => s.toolId === 13)).toBe(true);
    });
  });

  describe('getSessionSummary()', () => {
    it('should provide session summary', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      tracker.logToolShown(1, 'Mirroring', { sentiment: 'negative' });
      tracker.logToolUsed(1, 'Mirroring', false);

      tracker.logToolShown(2, 'Empathy Response', { sentiment: 'negative' });
      tracker.logToolDismissed(2, 'Empathy Response');

      const summary = tracker.getSessionSummary();

      expect(summary.sessionId).toBe('test-session-123');
      expect(summary.totalToolsShown).toBe(3);
      expect(summary.totalToolsUsed).toBe(2);
      expect(summary.overallUsageRate).toBeCloseTo(2/3, 2);
      expect(summary.mostUsedTools.length).toBeGreaterThan(0);
    });

    it('should rank most used tools', () => {
      // Tool 13 used 3 times
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      // Tool 1 used 1 time
      tracker.logToolShown(1, 'Mirroring', { sentiment: 'negative' });
      tracker.logToolUsed(1, 'Mirroring', false);

      const summary = tracker.getSessionSummary();

      expect(summary.mostUsedTools[0].toolId).toBe(13);
      expect(summary.mostUsedTools[0].count).toBe(3);
    });
  });

  describe('exportUsageData()', () => {
    it('should export complete usage data', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      const exported = tracker.exportUsageData();

      expect(exported.sessionId).toBe('test-session-123');
      expect(exported.records.length).toBe(2);
      expect(exported.statistics.length).toBe(1);
      expect(exported.summary).toBeDefined();
      expect(exported.sessionDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearUsageData()', () => {
    it('should clear all usage data', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      expect(tracker.getRecordCount()).toBe(2);

      tracker.clearUsageData();

      expect(tracker.getRecordCount()).toBe(0);
    });

    it('should generate new session ID after clear', () => {
      const summary1 = tracker.getSessionSummary();
      const sessionId1 = summary1.sessionId;

      tracker.clearUsageData();

      const summary2 = tracker.getSessionSummary();
      const sessionId2 = summary2.sessionId;

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('getToolRecords()', () => {
    it('should retrieve all records for specific tool', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);
      tracker.logToolShown(1, 'Mirroring', { sentiment: 'negative' });

      const tool13Records = tracker.getToolRecords(13);
      const tool1Records = tracker.getToolRecords(1);

      expect(tool13Records.length).toBe(2);
      expect(tool1Records.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tool used without being shown', () => {
      // Direct use without show (edge case)
      tracker.logToolUsed(13, 'Take Away', false);

      const records = tracker.getToolRecords(13);
      expect(records.length).toBe(1);
      expect(records[0].eventType).toBe('used');
    });

    it('should handle multiple shows before use', () => {
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
      tracker.logToolUsed(13, 'Take Away', false);

      const stats = tracker.getToolStatistics(13);
      expect(stats?.timesShown).toBe(2);
      expect(stats?.timesUsed).toBe(1);
    });

    it('should handle empty session', () => {
      const summary = tracker.getSessionSummary();

      expect(summary.totalToolsShown).toBe(0);
      expect(summary.totalToolsUsed).toBe(0);
      expect(summary.overallUsageRate).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle large number of records efficiently', () => {
      const start = performance.now();

      // Log 1000 tool interactions
      for (let i = 0; i < 1000; i++) {
        const toolId = (i % 13) + 1;
        tracker.logToolShown(toolId, `Tool ${toolId}`, { sentiment: 'neutral' });
        if (i % 2 === 0) {
          tracker.logToolUsed(toolId, `Tool ${toolId}`, false);
        } else {
          tracker.logToolDismissed(toolId, `Tool ${toolId}`);
        }
      }

      const duration = performance.now() - start;

      expect(tracker.getRecordCount()).toBe(2000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should retrieve statistics quickly', () => {
      // Create some data
      for (let i = 0; i < 100; i++) {
        tracker.logToolShown(13, 'Take Away', { sentiment: 'negative' });
        tracker.logToolUsed(13, 'Take Away', false);
      }

      const start = performance.now();
      const stats = tracker.getToolStatistics(13);
      const duration = performance.now() - start;

      expect(stats).not.toBeNull();
      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });
});
