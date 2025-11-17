/**
 * Integration tests for briefing generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailyBriefing } from '../../server/services/briefingGenerator';

// Mock dependencies
vi.mock('../../server/db', () => ({
  createBriefing: vi.fn().mockResolvedValue({ insertId: 1 }),
  createAlert: vi.fn().mockResolvedValue(undefined),
  createOrUpdateRelationship: vi.fn().mockResolvedValue(undefined),
  createCalendarEvent: vi.fn().mockResolvedValue(undefined),
  createLlmAnalysis: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue({
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

vi.mock('../../server/services/mcpIntegration', () => ({
  fetchGmailMessages: vi.fn().mockResolvedValue([]),
  fetchCalendarEvents: vi.fn().mockResolvedValue([]),
  fetchLimitlessRecordings: vi.fn().mockResolvedValue([]),
  extractContactFromEmail: vi.fn().mockReturnValue(null),
  calculateHealthScore: vi.fn().mockReturnValue(50),
  calculateTrend: vi.fn().mockReturnValue('stable' as const),
}));

vi.mock('../../server/services/alertsGenerator', () => ({
  generateResponseUrgencyAlerts: vi.fn().mockReturnValue([]),
  generateRelationshipCoolingAlerts: vi.fn().mockReturnValue([]),
  generateCalendarPreparationAlerts: vi.fn().mockReturnValue([]),
  generateStrategicOpportunityAlerts: vi.fn().mockReturnValue([]),
}));

vi.mock('../../server/services/llmAnalysis', () => ({
  analyzeOpportunity: vi.fn().mockResolvedValue({
    claude: 'Analysis',
    gemini: 'Analysis',
    grok: 'Analysis',
    perplexity: 'Analysis',
    consensus: 'Consensus',
    dissent: 'None',
    recommendation: 'Proceed',
  }),
}));

vi.mock('../../server/services/progressTracker', () => ({
  progressTracker: {
    startSession: vi.fn(),
    updateProgress: vi.fn(),
    completeSession: vi.fn(),
  },
}));

describe('Briefing Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate briefing successfully', async () => {
    const briefingId = await generateDailyBriefing();

    expect(briefingId).toBe(1);
  });

  it('should handle empty data gracefully', async () => {
    const briefingId = await generateDailyBriefing();

    expect(briefingId).toBeDefined();
    expect(typeof briefingId).toBe('number');
  });

  it('should track progress when sessionId provided', async () => {
    const { progressTracker } = await import('../../server/services/progressTracker');

    await generateDailyBriefing('test-session');

    expect(progressTracker.startSession).toHaveBeenCalledWith('test-session');
    expect(progressTracker.updateProgress).toHaveBeenCalled();
    expect(progressTracker.completeSession).toHaveBeenCalled();
  });
});
