/**
 * Unit tests for LLM analysis functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeOpportunity } from '../../server/services/llmAnalysis';

// Mock the LLM invocation
vi.mock('../../server/_core/llm', () => ({
  invokeLLM: vi.fn(),
}));

// Mock fetch for external APIs
global.fetch = vi.fn();

describe('LLM Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeOpportunity', () => {
    it('should call all 4 LLM APIs', async () => {
      // Mock Claude response
      const { invokeLLM } = await import('../../server/_core/llm');
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [{ message: { content: 'Claude analysis' } }],
      } as any);

      // Mock Gemini response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Gemini analysis' }] } }],
        }),
      } as Response);

      // Mock Grok response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          choices: [{ message: { content: 'Grok analysis' } }],
        }),
      } as Response);

      // Mock Perplexity response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          choices: [{ message: { content: 'Perplexity analysis' } }],
        }),
      } as Response);

      // Mock consensus generation
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'CONSENSUS: All agree\nDISSENT: None\nRECOMMENDATION: Proceed',
          },
        }],
      } as any);

      const result = await analyzeOpportunity('Test Opportunity', 'Test context');

      expect(result.claude).toBe('Claude analysis');
      expect(result.gemini).toBe('Gemini analysis');
      expect(result.grok).toBe('Grok analysis');
      expect(result.perplexity).toBe('Perplexity analysis');
      expect(result.consensus).toBeDefined();
      expect(result.dissent).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should handle API failures gracefully', async () => {
      const { invokeLLM } = await import('../../server/_core/llm');
      vi.mocked(invokeLLM).mockRejectedValue(new Error('API Error'));

      vi.mocked(global.fetch).mockRejectedValue(new Error('Fetch error'));

      const result = await analyzeOpportunity('Test', 'Context');

      // Should still return structure even if APIs fail
      expect(result).toHaveProperty('claude');
      expect(result).toHaveProperty('gemini');
      expect(result).toHaveProperty('grok');
      expect(result).toHaveProperty('perplexity');
    });
  });
});
