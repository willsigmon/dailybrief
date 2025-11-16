import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ProgressUpdate {
  step: string;
  progress: number;
  message: string;
  timestamp: string;
}

interface BriefingProgressBarProps {
  sessionId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function BriefingProgressBar({ sessionId, onComplete, onError }: BriefingProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Connecting...');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const eventSource = new EventSource(`/api/progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          setMessage('Connected to server');
        } else if (data.type === 'progress') {
          setProgress(data.progress);
          setMessage(data.message);

          if (data.step === 'completed') {
            setStatus('success');
            eventSource.close();
            setTimeout(() => {
              onComplete?.();
            }, 1500);
          } else if (data.step === 'failed') {
            setStatus('error');
            eventSource.close();
            onError?.(data.message);
          }
        }
      } catch (error) {
        console.error('Failed to parse progress update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setStatus('error');
      setMessage('Connection error - retrying...');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, onComplete, onError]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            {status === 'loading' && 'Generating Your Briefing'}
            {status === 'success' && 'Briefing Complete!'}
            {status === 'error' && 'Generation Failed'}
          </h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <span className="text-sm font-medium">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </Card>
  );
}
