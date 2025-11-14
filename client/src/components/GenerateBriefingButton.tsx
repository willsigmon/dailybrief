import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function GenerateBriefingButton() {
  const utils = trpc.useUtils();
  const generateMutation = trpc.generate.dailyBriefing.useMutation({
    onSuccess: () => {
      toast.success("Daily briefing generated successfully!");
      utils.briefing.getLatest.invalidate();
      utils.relationships.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to generate briefing: ${error.message}`);
    },
  });

  return (
    <Button
      onClick={() => generateMutation.mutate()}
      disabled={generateMutation.isPending}
      className="gap-2"
    >
      {generateMutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate Briefing
        </>
      )}
    </Button>
  );
}
