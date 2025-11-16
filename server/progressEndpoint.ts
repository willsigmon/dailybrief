import { Request, Response } from 'express';
import { progressTracker } from './services/progressTracker';

/**
 * Server-Sent Events endpoint for real-time progress updates
 */
export function setupProgressEndpoint(app: any) {
  app.get('/api/progress/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

    // Listen for progress updates
    const progressHandler = (update: any) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', ...update })}\n\n`);
      
      // Close connection when complete or failed
      if (update.step === 'completed' || update.step === 'failed') {
        setTimeout(() => {
          res.end();
        }, 1000);
      }
    };

    progressTracker.on(`progress:${sessionId}`, progressHandler);

    // Clean up on client disconnect
    req.on('close', () => {
      progressTracker.off(`progress:${sessionId}`, progressHandler);
      res.end();
    });
  });
}
