/**
 * VoiceCoach V2 - Tool Usage Tracker
 * Logs tool usage for Phase 2 learning system
 * Tracks which tools are shown, used, and modified by users
 * LED Breadcrumbs: 6650-6699
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

/**
 * Tool usage event types
 */
export type ToolUsageEventType = 'shown' | 'used' | 'modified' | 'dismissed';

/**
 * Single tool usage record
 */
export interface ToolUsageRecord {
  toolId: number;
  toolName: string;
  eventType: ToolUsageEventType;
  timestamp: number;
  context: {
    transcript?: string;
    sentiment?: string;
    stage?: number;
    matchType?: 'pattern' | 'ai';
    confidence?: string;
  };
  userAction?: {
    wasUsed: boolean;
    wasModified: boolean;
    modifiedText?: string;
    timeToDismiss?: number; // ms from shown to dismissed
  };
  sessionId?: string;
}

/**
 * Aggregated tool statistics
 */
export interface ToolStatistics {
  toolId: number;
  toolName: string;
  timesShown: number;
  timesUsed: number;
  timesModified: number;
  timesDismissed: number;
  usageRate: number; // used / shown
  modificationRate: number; // modified / used
  avgTimeToAction: number; // average time to use or dismiss
  contextPatterns: {
    commonSentiments: string[];
    commonStages: number[];
    commonTranscriptPatterns: string[];
  };
}

/**
 * Session summary
 */
export interface SessionSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalToolsShown: number;
  totalToolsUsed: number;
  overallUsageRate: number;
  mostUsedTools: Array<{ toolId: number; toolName: string; count: number }>;
  leastUsedTools: Array<{ toolId: number; toolName: string; count: number }>;
}

/**
 * Tool Usage Tracker
 * Foundation for Phase 2 learning - collects usage data for future analysis
 */
export class ToolUsageTracker {
  private trail: BreadcrumbTrail;
  private usageLog: ToolUsageRecord[];
  private sessionId: string;
  private sessionStartTime: number;
  private pendingActions: Map<number, { shownAt: number; record: ToolUsageRecord }>;

  constructor(sessionId?: string) {
    this.trail = new BreadcrumbTrail('ToolUsageTracker');
    this.usageLog = [];
    this.sessionId = sessionId || this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.pendingActions = new Map();

    this.trail.light(6650, {
      operation: 'tool_usage_tracker_initialized',
      sessionId: this.sessionId,
      timestamp: this.sessionStartTime
    });
  }

  /**
   * Log when a tool is shown to the user
   */
  logToolShown(
    toolId: number,
    toolName: string,
    context: {
      transcript?: string;
      sentiment?: string;
      stage?: number;
      matchType?: 'pattern' | 'ai';
      confidence?: string;
    }
  ): void {
    const timestamp = Date.now();

    const record: ToolUsageRecord = {
      toolId,
      toolName,
      eventType: 'shown',
      timestamp,
      context,
      sessionId: this.sessionId
    };

    this.usageLog.push(record);

    // Track as pending action (waiting for user to use/dismiss)
    this.pendingActions.set(toolId, {
      shownAt: timestamp,
      record
    });

    this.trail.light(6651, {
      operation: 'tool_shown',
      toolId,
      toolName,
      matchType: context.matchType,
      confidence: context.confidence,
      timestamp
    });
  }

  /**
   * Log when user actually uses the shown tool
   */
  logToolUsed(
    toolId: number,
    toolName: string,
    wasModified: boolean = false,
    modifiedText?: string
  ): void {
    const timestamp = Date.now();
    const pending = this.pendingActions.get(toolId);

    const record: ToolUsageRecord = {
      toolId,
      toolName,
      eventType: 'used',
      timestamp,
      context: pending?.record.context || {},
      userAction: {
        wasUsed: true,
        wasModified,
        modifiedText,
        timeToDismiss: pending ? timestamp - pending.shownAt : 0
      },
      sessionId: this.sessionId
    };

    this.usageLog.push(record);

    // Remove from pending
    this.pendingActions.delete(toolId);

    this.trail.light(6652, {
      operation: 'tool_used',
      toolId,
      toolName,
      wasModified,
      timeToAction: record.userAction?.timeToDismiss,
      timestamp
    });
  }

  /**
   * Log when user modifies the tool text before using
   */
  logToolModified(
    toolId: number,
    toolName: string,
    originalText: string,
    modifiedText: string
  ): void {
    const timestamp = Date.now();
    const pending = this.pendingActions.get(toolId);

    const record: ToolUsageRecord = {
      toolId,
      toolName,
      eventType: 'modified',
      timestamp,
      context: pending?.record.context || {},
      userAction: {
        wasUsed: false, // Not yet used, just modified
        wasModified: true,
        modifiedText
      },
      sessionId: this.sessionId
    };

    this.usageLog.push(record);

    this.trail.light(6653, {
      operation: 'tool_modified',
      toolId,
      toolName,
      originalLength: originalText.length,
      modifiedLength: modifiedText.length,
      editDistance: this.calculateEditDistance(originalText, modifiedText),
      timestamp
    });
  }

  /**
   * Log when user dismisses tool without using
   */
  logToolDismissed(toolId: number, toolName: string): void {
    const timestamp = Date.now();
    const pending = this.pendingActions.get(toolId);

    const record: ToolUsageRecord = {
      toolId,
      toolName,
      eventType: 'dismissed',
      timestamp,
      context: pending?.record.context || {},
      userAction: {
        wasUsed: false,
        wasModified: false,
        timeToDismiss: pending ? timestamp - pending.shownAt : 0
      },
      sessionId: this.sessionId
    };

    this.usageLog.push(record);

    // Remove from pending
    this.pendingActions.delete(toolId);

    this.trail.light(6654, {
      operation: 'tool_dismissed',
      toolId,
      toolName,
      timeToAction: record.userAction?.timeToDismiss,
      timestamp
    });
  }

  /**
   * Get all usage records for a specific tool
   */
  getToolRecords(toolId: number): ToolUsageRecord[] {
    return this.usageLog.filter(record => record.toolId === toolId);
  }

  /**
   * Get statistics for a specific tool
   */
  getToolStatistics(toolId: number): ToolStatistics | null {
    const records = this.getToolRecords(toolId);

    if (records.length === 0) {
      return null;
    }

    const shown = records.filter(r => r.eventType === 'shown');
    const used = records.filter(r => r.eventType === 'used');
    const modified = records.filter(r => r.eventType === 'modified');
    const dismissed = records.filter(r => r.eventType === 'dismissed');

    const timesShown = shown.length;
    const timesUsed = used.length;
    const timesModified = modified.length;
    const timesDismissed = dismissed.length;

    const usageRate = timesShown > 0 ? timesUsed / timesShown : 0;
    const modificationRate = timesUsed > 0 ? timesModified / timesUsed : 0;

    // Calculate average time to action
    const actionTimes = [...used, ...dismissed]
      .map(r => r.userAction?.timeToDismiss || 0)
      .filter(t => t > 0);
    const avgTimeToAction = actionTimes.length > 0
      ? actionTimes.reduce((sum, t) => sum + t, 0) / actionTimes.length
      : 0;

    // Extract context patterns
    const sentiments = records
      .map(r => r.context.sentiment)
      .filter(s => s) as string[];
    const stages = records
      .map(r => r.context.stage)
      .filter(s => s !== undefined) as number[];

    const stats: ToolStatistics = {
      toolId,
      toolName: records[0].toolName,
      timesShown,
      timesUsed,
      timesModified,
      timesDismissed,
      usageRate,
      modificationRate,
      avgTimeToAction,
      contextPatterns: {
        commonSentiments: this.getMostCommon(sentiments, 3),
        commonStages: this.getMostCommon(stages, 3),
        commonTranscriptPatterns: [] // Placeholder for future pattern extraction
      }
    };

    return stats;
  }

  /**
   * Get statistics for all tools
   */
  getAllToolStatistics(): ToolStatistics[] {
    const toolIds = [...new Set(this.usageLog.map(r => r.toolId))];
    return toolIds
      .map(id => this.getToolStatistics(id))
      .filter(stat => stat !== null) as ToolStatistics[];
  }

  /**
   * Get session summary
   */
  getSessionSummary(): SessionSummary {
    const endTime = Date.now();
    const shown = this.usageLog.filter(r => r.eventType === 'shown');
    const used = this.usageLog.filter(r => r.eventType === 'used');

    const totalToolsShown = shown.length;
    const totalToolsUsed = used.length;
    const overallUsageRate = totalToolsShown > 0 ? totalToolsUsed / totalToolsShown : 0;

    // Count tool usage
    const toolUsageCounts = new Map<number, { name: string; count: number }>();
    used.forEach(record => {
      const current = toolUsageCounts.get(record.toolId) || { name: record.toolName, count: 0 };
      toolUsageCounts.set(record.toolId, {
        name: record.toolName,
        count: current.count + 1
      });
    });

    const sortedTools = Array.from(toolUsageCounts.entries())
      .map(([toolId, data]) => ({ toolId, toolName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count);

    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime,
      totalToolsShown,
      totalToolsUsed,
      overallUsageRate,
      mostUsedTools: sortedTools.slice(0, 5),
      leastUsedTools: sortedTools.slice(-5).reverse()
    };
  }

  /**
   * Export usage data for external analysis
   */
  exportUsageData(): {
    sessionId: string;
    sessionDuration: number;
    records: ToolUsageRecord[];
    statistics: ToolStatistics[];
    summary: SessionSummary;
  } {
    this.trail.light(6655, {
      operation: 'usage_data_exported',
      recordCount: this.usageLog.length,
      sessionId: this.sessionId
    });

    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      records: this.usageLog,
      statistics: this.getAllToolStatistics(),
      summary: this.getSessionSummary()
    };
  }

  /**
   * Clear all usage data (for testing or new session)
   */
  clearUsageData(): void {
    this.usageLog = [];
    this.pendingActions.clear();
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();

    this.trail.light(6656, {
      operation: 'usage_data_cleared',
      newSessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Get total record count
   */
  getRecordCount(): number {
    return this.usageLog.length;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate edit distance between two strings (Levenshtein distance)
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1, // substitution
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1      // insertion
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Get most common items from array
   */
  private getMostCommon<T>(items: T[], count: number): T[] {
    const counts = new Map<T, number>();

    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([item]) => item);
  }
}
