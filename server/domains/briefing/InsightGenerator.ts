import { invokeLLM } from '../../_core/llm';
import { analyzeOpportunity } from '../../services/llmAnalysis';
import { InsertAlert, InsertLlmAnalysis } from '../../../drizzle/schema';
import { logger, logError } from '../../_core/logger';

export class InsightGenerator {

  async analyzeOpportunities(briefingId: number, alerts: Omit<InsertAlert, 'id' | 'createdAt'>[]): Promise<InsertLlmAnalysis[]> {
    const strategicAlerts = alerts.filter(a => a.type === 'strategic').slice(0, 2);
    const results: InsertLlmAnalysis[] = [];

    for (const alert of strategicAlerts) {
      const context = `
Organization: ${alert.organization || 'Unknown'}
Contact: ${alert.contactName}
Description: ${alert.description}
Action Required: ${alert.actionRequired}
      `.trim();

      try {
        const analysis = await analyzeOpportunity(alert.title, context);

        results.push({
          briefingId,
          topic: alert.title,
          claudeAnalysis: analysis.claude,
          geminiAnalysis: analysis.gemini,
          grokAnalysis: analysis.grok,
          perplexityAnalysis: analysis.perplexity,
          consensus: analysis.consensus,
          dissent: analysis.dissent,
          recommendation: analysis.recommendation,
        });
      } catch (error) {
        logError(error, { operation: 'analyzeOpportunity', topic: alert.title });
      }
    }

    return results;
  }

  async generateExecutiveSummary(alerts: Omit<InsertAlert, 'id' | 'createdAt'>[]): Promise<string> {
    const urgentCount = alerts.filter(a => a.type === 'urgent').length;
    const importantCount = alerts.filter(a => a.type === 'important').length;
    const strategicCount = alerts.filter(a => a.type === 'strategic').length;

    const topOpportunities = alerts
      .filter(a => a.type === 'strategic')
      .slice(0, 3)
      .map(a => a.title);

    const systemPrompt = "You are an executive assistant creating a daily briefing summary.";
    const userPrompt = `Generate a brief executive summary (2-3 sentences) for a daily business development briefing:

ALERTS:
- ${urgentCount} urgent actions requiring immediate attention
- ${importantCount} important actions for this week
- ${strategicCount} strategic opportunities to monitor

TOP OPPORTUNITIES:
${topOpportunities.map((opp, i) => `${i + 1}. ${opp}`).join('\n')}

Write a concise, actionable summary that highlights the most critical items and sets the tone for the day.`;

    try {
      const response = await invokeLLM({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
      });
      return typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : 'Your daily briefing is ready.';
    } catch (error) {
      logError(error, { operation: 'generateExecutiveSummary' });
      return `Good morning. Today's briefing surfaces ${urgentCount} urgent items and ${strategicCount} strategic opportunities.`;
    }
  }
}
