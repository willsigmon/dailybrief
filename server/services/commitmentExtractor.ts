/**
 * Extract commitments from Limitless transcripts using LLM
 */

import { invokeLLM } from '../_core/llm';
import { logger, logError } from '../_core/logger';
import type { LimitlessRecording } from './mcpIntegration';

export interface Commitment {
  action: string;
  deadline: Date | null;
  responsibleParty: string | null;
  context: string;
  source: string; // Recording ID or reference
}

/**
 * Extract commitments from a Limitless transcript
 */
export async function extractCommitmentsFromTranscript(
  transcript: string,
  recordingId: string
): Promise<Commitment[]> {
  if (!transcript || transcript.trim().length === 0) {
    return [];
  }

  const prompt = `Extract all commitments, action items, and promises from the following conversation transcript.
For each commitment, identify:
1. The specific action or commitment made
2. Any deadline or timeframe mentioned
3. Who is responsible (if mentioned)
4. Relevant context

Return your response as a JSON array of commitments in this format:
[
  {
    "action": "Specific action item",
    "deadline": "YYYY-MM-DD or null if no deadline mentioned",
    "responsibleParty": "Name or null",
    "context": "Brief context about the commitment"
  }
]

TRANSCRIPT:
${transcript}

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a commitment extraction assistant. Extract action items and commitments from conversation transcripts. Return only valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== 'string') {
      return [];
    }

    // Parse JSON response
    const jsonMatch = messageContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('No JSON array found in commitment extraction response', { recordingId });
      return [];
    }

    const commitments = JSON.parse(jsonMatch[0]) as Array<{
      action: string;
      deadline: string | null;
      responsibleParty: string | null;
      context: string;
    }>;

    // Convert to Commitment format
    return commitments.map((c) => ({
      action: c.action,
      deadline: c.deadline ? new Date(c.deadline) : null,
      responsibleParty: c.responsibleParty,
      context: c.context,
      source: recordingId,
    }));
  } catch (error) {
    logError(error, { operation: 'extractCommitmentsFromTranscript', recordingId });
    return [];
  }
}

/**
 * Extract commitments from multiple Limitless recordings
 */
export async function extractCommitmentsFromRecordings(
  recordings: LimitlessRecording[]
): Promise<Commitment[]> {
  const allCommitments: Commitment[] = [];

  for (const recording of recordings) {
    if (!recording.transcript || recording.transcript.trim().length === 0) {
      continue;
    }

    const commitments = await extractCommitmentsFromTranscript(recording.transcript, recording.id);
    allCommitments.push(...commitments);
  }

  return allCommitments;
}

/**
 * Filter commitments by upcoming deadlines
 */
export function filterUpcomingCommitments(
  commitments: Commitment[],
  daysAhead: number = 7
): Commitment[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  return commitments.filter((c) => {
    if (!c.deadline) return false;
    return c.deadline <= cutoffDate && c.deadline >= new Date();
  });
}
