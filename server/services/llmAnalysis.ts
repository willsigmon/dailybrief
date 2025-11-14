import { invokeLLM } from '../_core/llm';

export interface OpportunityAnalysis {
  claude: string;
  gemini: string;
  grok: string;
  perplexity: string;
  consensus: string;
  dissent: string;
  recommendation: string;
}

/**
 * Analyze an opportunity using Claude Sonnet 4.5
 */
async function analyzeWithClaude(prompt: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a strategic business development advisor. Provide concise, actionable analysis focused on relationship signals, strategic fit, and risks. Be direct and highlight what matters most.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    return typeof messageContent === 'string' ? messageContent : 'Analysis unavailable';
  } catch (error) {
    console.error('[LLM] Claude analysis failed:', error);
    return 'Analysis failed';
  }
}

/**
 * Analyze an opportunity using Gemini 2.5 Pro
 */
async function analyzeWithGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a data-driven business analyst. ${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable';
  } catch (error) {
    console.error('[LLM] Gemini analysis failed:', error);
    return 'Analysis failed';
  }
}

/**
 * Analyze an opportunity using Grok 4
 */
async function analyzeWithGrok(prompt: string): Promise<string> {
  try {
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
            content: 'You are a contrarian analyst. Provide devil\'s advocate perspective, highlighting risks, edge cases, and potential downsides. Be skeptical but constructive.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Analysis unavailable';
  } catch (error) {
    console.error('[LLM] Grok analysis failed:', error);
    return 'Analysis failed';
  }
}

/**
 * Analyze an opportunity using Perplexity Sonar Pro
 */
async function analyzeWithPerplexity(prompt: string): Promise<string> {
  try {
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
            content: 'You are a research analyst with access to real-time information. Provide context from recent news, funding, market position, and credibility signals.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Analysis unavailable';
  } catch (error) {
    console.error('[LLM] Perplexity analysis failed:', error);
    return 'Analysis failed';
  }
}

/**
 * Generate consensus and dissent summary using Claude
 */
async function generateConsensusSummary(analyses: { claude: string; gemini: string; grok: string; perplexity: string }): Promise<{ consensus: string; dissent: string; recommendation: string }> {
  const prompt = `Analyze these four AI model perspectives on a business opportunity and provide:

1. CONSENSUS: What do all models agree on? (2-3 sentences)
2. DISSENT: What are the key disagreements or contrarian views? (2-3 sentences)
3. RECOMMENDATION: Final actionable recommendation based on the analysis (2-3 sentences)

CLAUDE ANALYSIS:
${analyses.claude}

GEMINI ANALYSIS:
${analyses.gemini}

GROK ANALYSIS:
${analyses.grok}

PERPLEXITY ANALYSIS:
${analyses.perplexity}

Provide your response in this exact format:
CONSENSUS: [your consensus summary]
DISSENT: [your dissent summary]
RECOMMENDATION: [your recommendation]`;

  try {
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';
    
    const consensusMatch = content.match(/CONSENSUS:[\s\S]*?([^\n]+)/);
    const dissentMatch = content.match(/DISSENT:[\s\S]*?([^\n]+)/);
    const recommendationMatch = content.match(/RECOMMENDATION:[\s\S]*?([^\n]+)/);

    return {
      consensus: consensusMatch?.[1]?.trim() || 'Unable to determine consensus',
      dissent: dissentMatch?.[1]?.trim() || 'No significant dissent',
      recommendation: recommendationMatch?.[1]?.trim() || 'Further analysis needed',
    };
  } catch (error) {
    console.error('[LLM] Consensus generation failed:', error);
    return {
      consensus: 'Analysis incomplete',
      dissent: 'Analysis incomplete',
      recommendation: 'Manual review required',
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
  const analysisPrompt = `Analyze this business development opportunity and provide a strategic recommendation:

TOPIC: ${topic}

CONTEXT:
${context}

YOUR TASK:
Provide a strategic recommendation on whether to prioritize this opportunity. Consider:
1. Strategic fit and value
2. Relationship signals and engagement
3. Risks or concerns
4. Recommended next steps

Be direct, actionable, and highlight what matters most. Keep your response to 3-4 sentences.`;

  console.log(`[LLM] Starting multi-model analysis for: ${topic}`);

  // Run all analyses in parallel
  const [claude, gemini, grok, perplexity] = await Promise.all([
    analyzeWithClaude(analysisPrompt),
    analyzeWithGemini(analysisPrompt),
    analyzeWithGrok(analysisPrompt),
    analyzeWithPerplexity(analysisPrompt),
  ]);

  console.log('[LLM] All model analyses complete, generating consensus...');

  // Generate consensus summary
  const { consensus, dissent, recommendation } = await generateConsensusSummary({
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
  };
}
