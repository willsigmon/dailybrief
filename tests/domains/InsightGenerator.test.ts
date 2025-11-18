import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightGenerator } from '../../server/domains/briefing/InsightGenerator';
import { invokeLLM } from '../../server/_core/llm';
import { analyzeOpportunity } from '../../server/services/llmAnalysis';

// Mock dependencies
vi.mock('../../server/_core/llm', () => ({
  invokeLLM: vi.fn(),
}));

vi.mock('../../server/services/llmAnalysis', () => ({
  analyzeOpportunity: vi.fn(),
}));

// Mock logger to silence output during tests
vi.mock('../../server/_core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
}));

describe('InsightGenerator', () => {
  let generator: InsightGenerator;

  beforeEach(() => {
    generator = new InsightGenerator();
    vi.clearAllMocks();
  });

  describe('analyzeOpportunities', () => {
    it('should analyze strategic alerts and return formatted results', async () => {
      const mockAlerts = [
        {
          briefingId: 1,
          type: 'strategic' as const,
          category: 'opportunity',
          title: 'Big Deal',
          description: 'A big opportunity',
          contactName: 'John Doe',
          organization: 'Acme Corp',
          actionRequired: 'Call him',
          deadline: null,
          completed: false,
          completedAt: null,
        },
        {
          briefingId: 1,
          type: 'urgent' as const,
          category: 'response',
          title: 'Urgent Email',
          description: 'Reply now',
          contactName: 'Jane Doe',
          organization: 'Beta Corp',
          actionRequired: 'Reply',
          deadline: new Date(),
          completed: false,
          completedAt: null,
        }
      ];

      const mockAnalysis = {
        claude: 'Claude analysis',
        gemini: 'Gemini analysis',
        grok: 'Grok analysis',
        perplexity: 'Perplexity analysis',
        consensus: 'They agree',
        dissent: 'They disagree',
        recommendation: 'Do it',
        confidenceScore: 80,
        modelAgreement: 75,
      };

      (analyzeOpportunity as any).mockResolvedValue(mockAnalysis);

      const results = await generator.analyzeOpportunities(123, mockAlerts);

      expect(results).toHaveLength(1); // Only 1 strategic alert
      expect(results[0].briefingId).toBe(123);
      expect(results[0].topic).toBe('Big Deal');
      expect(results[0].consensus).toBe('They agree');
      expect(analyzeOpportunity).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const mockAlerts = [
        {
          briefingId: 1,
          type: 'strategic' as const,
          category: 'opportunity',
          title: 'Big Deal',
          description: 'A big opportunity',
          contactName: 'John Doe',
          organization: 'Acme Corp',
          actionRequired: 'Call him',
          deadline: null,
          completed: false,
          completedAt: null,
        }
      ];

      (analyzeOpportunity as any).mockRejectedValue(new Error('API Failed'));

      const results = await generator.analyzeOpportunities(123, mockAlerts);

      expect(results).toHaveLength(0); // Should return empty array on error (handled internally)
    });
  });

  describe('generateExecutiveSummary', () => {
    it('should generate a summary using LLM', async () => {
      const mockAlerts = [
        { type: 'urgent', title: 'Urgent 1' },
        { type: 'important', title: 'Imp 1' },
        { type: 'strategic', title: 'Strat 1' },
      ] as any[];

      (invokeLLM as any).mockResolvedValue({
        choices: [
          { message: { content: 'This is the summary.' } }
        ]
      });

      const summary = await generator.generateExecutiveSummary(mockAlerts);

      expect(summary).toBe('This is the summary.');
      expect(invokeLLM).toHaveBeenCalledTimes(1);
      const callArgs = (invokeLLM as any).mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain('ALERTS:');
    });

    it('should return fallback summary on LLM failure', async () => {
      const mockAlerts = [
        { type: 'urgent', title: 'Urgent 1' },
      ] as any[];

      (invokeLLM as any).mockRejectedValue(new Error('LLM Failed'));

      const summary = await generator.generateExecutiveSummary(mockAlerts);

      expect(summary).toContain('Good morning');
      expect(summary).toContain('1 urgent items');
    });
  });
});
