import { EventEmitter } from 'events';

export interface ProgressUpdate {
  step: string;
  progress: number; // 0-100
  message: string;
  timestamp: Date;
}

class ProgressTracker extends EventEmitter {
  private sessions: Map<string, ProgressUpdate[]> = new Map();

  startSession(sessionId: string) {
    this.sessions.set(sessionId, []);
    this.emitProgress(sessionId, {
      step: 'started',
      progress: 0,
      message: 'Starting briefing generation...',
      timestamp: new Date(),
    });
  }

  updateProgress(sessionId: string, update: Omit<ProgressUpdate, 'timestamp'>) {
    const progressUpdate: ProgressUpdate = {
      ...update,
      timestamp: new Date(),
    };

    const history = this.sessions.get(sessionId) || [];
    history.push(progressUpdate);
    this.sessions.set(sessionId, history);

    this.emitProgress(sessionId, progressUpdate);
  }

  completeSession(sessionId: string, success: boolean, message: string) {
    this.emitProgress(sessionId, {
      step: success ? 'completed' : 'failed',
      progress: 100,
      message,
      timestamp: new Date(),
    });

    // Clean up after 1 minute
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000);
  }

  private emitProgress(sessionId: string, update: ProgressUpdate) {
    this.emit(`progress:${sessionId}`, update);
    console.log(`[Progress:${sessionId}] ${update.progress}% - ${update.message}`);
  }

  getHistory(sessionId: string): ProgressUpdate[] {
    return this.sessions.get(sessionId) || [];
  }
}

export const progressTracker = new ProgressTracker();
