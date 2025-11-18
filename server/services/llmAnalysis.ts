import { invokeLLM } from '../_core/llm';
import { retryWithBackoff, isRetryableError } from '../_core/retry';
import { logger, logError } from '../_core/logger';
import { trackLLMCall } from '../_core/metrics';

export interface OpportunityAnalysis {
  claude: string;
  gemini: string;
  grok: string;
  perplexity: string;
  consensus: string;
  dissent: string;
  recommendation: string;
  confidenceScore?: number; // 0-100
  modelAgreement?: number; // 0-100, how much models agree
}

/**
 * Helper to wrap content in XML tags for safer LLM consumption
 */
function wrapInTags(tag: string, content: string): string {
  // Basic sanitization to prevent tag injection
  const safeContent = content.replace(new RegExp(`</${tag}>`, 'g'), `[/${tag}]`);
  return `<${tag}>\n${safeContent}\n</${tag}>`;
}

/**
 * Analyze an opportunity using Claude Sonnet 4.5
 */
async function analyzeWithClaude(prompt: string, systemRole: string): Promise<string> {
  const startTime = Date.now();
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: systemRole
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const result = typeof messageContent === 'string' ? messageContent : 'Analysis unavailable';
    trackLLMCall('claude', true, Date.now() - startTime);
    return result;
  } catch (error) {
    trackLLMCall('claude', false, Date.now() - startTime);
    logError(error, { operation: 'analyzeWithClaude' });
    return 'Analysis failed - service unavailable';
  }
}

/**
 * Analyze an opportunity using Gemini 2.5 Pro
 */
async function analyzeWithGemini(prompt: string, systemRole: string): Promise<string> {
  const startTime = Date.now();
  try {
    return await retryWithBackoff(
      async () => {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemRole}\n\n${prompt}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            }
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable';
        trackLLMCall('gemini', true, Date.now() - startTime);
        return result;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        retryableErrors: isRetryableError,
      }
    );
  } catch (error) {
    trackLLMCall('gemini', false, Date.now() - startTime);
    logError(error, { operation: 'analyzeWithGemini' });
    return 'Analysis failed - service unavailable';
  }
}

/**
 * Analyze an opportunity using Grok 4
 */
async function analyzeWithGrok(prompt: string, systemRole: string): Promise<string> {
  const startTime = Date.now();
  try {
    return await retryWithBackoff(
      async () => {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY || ''}`,
          },
          body: JSON.stringify({
            model: 'grok-4',
            messages: [
              {
                role: 'system',
                content: systemRole
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content || 'Analysis unavailable';
        trackLLMCall('grok', true, Date.now() - startTime);
        return result;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        retryableErrors: isRetryableError,
      }
    );
  } catch (error) {
    trackLLMCall('grok', false, Date.now() - startTime);
    logError(error, { operation: 'analyzeWithGrok' });
    return 'Analysis failed - service unavailable';
  }
}

/**
 * Analyze an opportunity using Perplexity Sonar Pro
 */
async function analyzeWithPerplexity(prompt: string, systemRole: string): Promise<string> {
  const startTime = Date.now();
  try {
    return await retryWithBackoff(
      async () => {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SONAR_API_KEY || ''}`,
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: systemRole
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content || 'Analysis unavailable';
        trackLLMCall('perplexity', true, Date.now() - startTime);
        return result;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        retryableErrors: isRetryableError,
      }
    );
  } catch (error) {
    trackLLMCall('perplexity', false, Date.now() - startTime);
    logError(error, { operation: 'analyzeWithPerplexity' });
    return 'Analysis failed - service unavailable';
  }
}

/**
 * Calculate confidence score based on model agreement
 */
function calculateConfidenceScore(analyses: { claude: string; gemini: string; grok: string; perplexity: string }): number {
  // Simple keyword-based agreement detection
  const keywords = ['recommend', 'proceed', 'opportunity', 'strategic', 'risk', 'concern', 'positive', 'negative'];
  const keywordCounts = new Map<string, number>();

  for (const [model, analysis] of Object.entries(analyses)) {
    const lowerAnalysis = analysis.toLowerCase();
    for (const keyword of keywords) {
      if (lowerAnalysis.includes(keyword)) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      }
    }
  }

  // Calculate agreement based on shared keywords
  const totalKeywords = keywordCounts.size;
  const sharedKeywords = Array.from(keywordCounts.values()).filter(count => count >= 3).length; // At least 3 models agree

  // Base confidence on agreement
  const agreementRatio = totalKeywords > 0 ? sharedKeywords / totalKeywords : 0;
  return Math.round(agreementRatio * 100);
}

/**
 * Calculate model agreement percentage
 */
function calculateModelAgreement(analyses: { claude: string; gemini: string; grok: string; perplexity: string }): number {
  // Extract sentiment/key recommendations from each analysis
  const sentiments: ('positive' | 'negative' | 'neutral')[] = [];

  for (const analysis of Object.values(analyses)) {
    const lower = analysis.toLowerCase();
    if (lower.includes('recommend') || lower.includes('proceed') || lower.includes('positive')) {
      sentiments.push('positive');
    } else if (lower.includes('risk') || lower.includes('concern') || lower.includes('negative') || lower.includes('avoid')) {
      sentiments.push('negative');
    } else {
      sentiments.push('neutral');
    }
  }

  // Count agreement
  const positiveCount = sentiments.filter(s => s === 'positive').length;
  const negativeCount = sentiments.filter(s => s === 'negative').length;
  const neutralCount = sentiments.filter(s => s === 'neutral').length;

  // Agreement is highest count / total
  const maxCount = Math.max(positiveCount, negativeCount, neutralCount);
  return Math.round((maxCount / 4) * 100);
}

/**
 * Generate consensus and dissent summary using Claude with weighted voting
 */
async function generateConsensusSummary(analyses: { claude: string; gemini: string; grok: string; perplexity: string }): Promise<{ consensus: string; dissent: string; recommendation: string; confidenceScore: number; modelAgreement: number }> {
  const systemPrompt = `You are an expert synthesist. Your task is to analyze four AI model perspectives and identify the consensus, dissent, and final recommendation.`;

  const userPrompt = `Analyze these four AI model perspectives on a business opportunity:

${wrapInTags('claude_analysis', analyses.claude)}
${wrapInTags('gemini_analysis', analyses.gemini)}
${wrapInTags('grok_analysis', analyses.grok)}
${wrapInTags('perplexity_analysis', analyses.perplexity)}

Provide:
1. CONSENSUS: What do all models agree on? (2-3 sentences)
2. DISSENT: What are the key disagreements or contrarian views? (2-3 sentences)
3. RECOMMENDATION: Final actionable recommendation based on the analysis (2-3 sentences)

Provide your response in this exact format:
CONSENSUS: [your consensus summary]
DISSENT: [your dissent summary]
RECOMMENDATION: [your recommendation]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';

    const consensusMatch = content.match(/CONSENSUS:[\s\S]*?([^\n]+)/);
    const dissentMatch = content.match(/DISSENT:[\s\S]*?([^\n]+)/);
    const recommendationMatch = content.match(/RECOMMENDATION:[\s\S]*?([^\n]+)/);

    const consensus = consensusMatch?.[1]?.trim() || 'Unable to determine consensus';
    const dissent = dissentMatch?.[1]?.trim() || 'No significant dissent';
    const recommendation = recommendationMatch?.[1]?.trim() || 'Further analysis needed';

    // Calculate confidence and agreement scores
    const confidenceScore = calculateConfidenceScore(analyses);
    const modelAgreement = calculateModelAgreement(analyses);

    return {
      consensus,
      dissent,
      recommendation,
      confidenceScore,
      modelAgreement,
    };
  } catch (error) {
    logError(error, { operation: 'generateConsensusSummary' });
    return {
      consensus: 'Analysis incomplete',
      dissent: 'Analysis incomplete',
      recommendation: 'Manual review required',
      confidenceScore: 0,
      modelAgreement: 0,
    };
  }
}

/**
 * Run multi-LLM analysis on an opportunity
 */
export async function analyzeOpportunity(
  topic: string,
  context: string
): Promise<OpportunityAnalysis> {
  const systemPrompt = `You are a strategic business development advisor. Analyze the provided context within the <context> tags.
Your goal is to provide a strategic recommendation on whether to prioritize this opportunity.

Consider:
1. Strategic fit and value
2. Relationship signals and engagement
3. Risks or concerns
4. Recommended next steps`;

  const analysisPrompt = `Topic: ${topic}

${wrapInTags('context', context)}

Be direct, actionable, and highlight what matters most. Keep your response to 3-4 sentences.`;

  logger.debug('Starting multi-model analysis', { topic });

  const claudeSystem = 'You are a strategic business development advisor. Provide concise, actionable analysis focused on relationship signals, strategic fit, and risks. Be direct and highlight what matters most.';
  const geminiSystem = 'You are a data-driven business analyst.';
  const grokSystem = 'You are a contrarian analyst. Provide devil\'s advocate perspective, highlighting risks, edge cases, and potential downsides. Be skeptical but constructive.';
  const perplexitySystem = 'You are a research analyst with access to real-time information. Provide context from recent news, funding, market position, and credibility signals.';

  // Run all analyses in parallel
  const analysisStartTime = Date.now();
  const [claude, gemini, grok, perplexity] = await Promise.all([
    analyzeWithClaude(analysisPrompt, claudeSystem),
    analyzeWithGemini(analysisPrompt, geminiSystem),
    analyzeWithGrok(analysisPrompt, grokSystem),
    analyzeWithPerplexity(analysisPrompt, perplexitySystem),
  ]);

  logger.debug('All model analyses complete, generating consensus', {
    topic,
    durationMs: Date.now() - analysisStartTime,
  });

  // Generate consensus summary with confidence scores
  const { consensus, dissent, recommendation, confidenceScore, modelAgreement } = await generateConsensusSummary({
    claude,
    gemini,
    grok,
    perplexity,
  });

  return {
    claude,
    gemini,
    grok,
    perplexity,
    consensus,
    dissent,
    recommendation,
    confidenceScore,
    modelAgreement,
  };
}
