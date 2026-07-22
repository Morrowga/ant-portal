import { useMutation } from "@tanstack/react-query";

import { api, errorDetail } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/shared/bits";

/** Deliberately NOT a shadcn Dialog -- those close on backdrop click and
 * Escape by default, which this must never do. Plain fixed-position
 * overlay with no dismiss path except answering Yes or No. */
export function PresenceCheckModal({ promptId, onAnswered }: { promptId: string; onAnswered: () => void }) {
  const respond = useMutation({
    mutationFn: (response: "yes" | "no") =>
      api.post(`/attendance/presence-check/${promptId}/respond`, { response }),
    onSuccess: onAnswered,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <p className="font-display text-xl font-semibold">Are you there?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your manager wants to quickly confirm you're okay. Answer honestly — this only affects
          whether a short deduction applies, nothing more.
        </p>
        {respond.isError && <ErrorText>{errorDetail(respond.error)}</ErrorText>}
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" disabled={respond.isPending} onClick={() => respond.mutate("yes")}>
            {respond.isPending && respond.variables === "yes" ? "Sending…" : "Yes, I'm here"}
          </Button>
          <Button
            className="flex-1" variant="outline" disabled={respond.isPending}
            onClick={() => respond.mutate("no")}
          >
            {respond.isPending && respond.variables === "no" ? "Sending…" : "No, not right now"}
          </Button>
        </div>
      </div>
    </div>
  );
}