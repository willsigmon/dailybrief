import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { BriefingProgressBar } from "./BriefingProgressBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GenerateBriefingButton() {
  const utils = trpc.useUtils();
  const [showProgress, setShowProgress] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const generateMutation = trpc.generate.dailyBriefing.useMutation({
    onSuccess: (data) => {
      // Progress bar will handle success state
    },
    onError: (error) => {
      setShowProgress(false);
      toast.error(`Failed to generate briefing: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setShowProgress(true);
    generateMutation.mutate({ sessionId: newSessionId });
  };

  const handleComplete = () => {
    toast.success("Daily briefing generated successfully!");
    setShowProgress(false);
    utils.briefing.getLatest.invalidate();
    utils.relationships.getAll.invalidate();
  };

  const handleError = (error: string) => {
    toast.error(`Generation failed: ${error}`);
    setShowProgress(false);
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
        className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0"
        size="lg"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Generate Briefing
          </>
        )}
      </Button>

      <Dialog open={showProgress} onOpenChange={setShowProgress}>
        <DialogContent className="sm:max-w-md glass border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Generating Your Intelligence Briefing
            </DialogTitle>
            <DialogDescription className="text-base">
              This may take 30-60 seconds while we analyze your data and generate insights.
            </DialogDescription>
          </DialogHeader>
          {sessionId && (
            <BriefingProgressBar
              sessionId={sessionId}
              onComplete={handleComplete}
              onError={handleError}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
