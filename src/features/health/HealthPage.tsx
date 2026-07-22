/**
 * Personal health — SELF-ONLY by design. The prompt-driven check-in flow is
 * the primary content: pending reminders open their dialog right here, the
 * disappearance from the list is the success confirmation.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api-client";
import type { CheckinPrompt, HealthDashboard } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyText, SectionTitle, StatRow } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

import { MoodWaterCheckinDialog, SleepCheckinDialog } from "./checkin-dialogs";

const PROMPT_LABEL: Record<CheckinPrompt["type"], string> = {
  sleep_checkin: "Sleep check-in",
  mood_water_checkin: "Mood & water check-in",
};

export function HealthPage() {
  const qc = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["health", "dashboard"],
    queryFn: async () => (await api.get<HealthDashboard>("/health/me/dashboard")).data,
  });
  const pending = useQuery({
    queryKey: ["health", "prompts", "pending"],
    queryFn: async () => (await api.get<CheckinPrompt[]>("/health/prompts/pending")).data,
    refetchInterval: 60_000,
  });
  const todaysPrompts = useQuery({
    queryKey: ["health", "prompts", "today"],
    queryFn: async () => (await api.get<CheckinPrompt[]>("/health/prompts/today")).data,
  });
  const [answering, setAnswering] = useState<CheckinPrompt | null>(null);

  const closeDialog = () => {
    setAnswering(null);
    qc.invalidateQueries({ queryKey: ["health", "prompts"] });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Your health</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only you can see this. Your company only ever sees anonymous team averages — never your entries.
      </p>

      <SectionTitle>Reminders</SectionTitle>
      <QueryBoundary query={pending}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  All caught up — nothing waiting right now.
                </CardContent>
              </Card>
            )}
            {rows.map((prompt) => (
              <button key={prompt.id} className="block w-full text-left" onClick={() => setAnswering(prompt)}>
                <Card className="border-copper/40 bg-copper/5 transition-colors hover:bg-copper/10">
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-espresso">{PROMPT_LABEL[prompt.type]}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Click to answer now</p>
                    </div>
                    <Badge variant="warning">unanswered</Badge>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </QueryBoundary>

      <SectionTitle>Today's check-ins</SectionTitle>
      <QueryBoundary query={todaysPrompts}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && (
              <EmptyText>No reminders sent yet today — they'll appear here once you check in.</EmptyText>
            )}
            {rows.map((prompt) => (
              <Card key={prompt.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm">{PROMPT_LABEL[prompt.type]}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(prompt.sent_at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant={prompt.responded_at ? "success" : "warning"}>
                    {prompt.responded_at ? "answered" : "unanswered"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <SectionTitle>This week</SectionTitle>
      <QueryBoundary query={dashboard}>
        {(data) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <StatRow label="Average water / day" value={`${Math.round(sum(data.water) / 7)} ml`} />
            <StatRow label="Average mood" value={data.mood.length ? (sum(data.mood) / data.mood.length).toFixed(1) + " / 5" : "—"} />
            <StatRow label="Average sleep / day" value={data.sleep.length ? `${(sum(data.sleep) / 7).toFixed(1)} h` : "—"} />
          </div>
        )}
      </QueryBoundary>

      <SleepCheckinDialog
        promptId={answering?.type === "sleep_checkin" ? answering.id : null}
        open={answering?.type === "sleep_checkin"}
        onDone={closeDialog}
      />
      <MoodWaterCheckinDialog
        promptId={answering?.type === "mood_water_checkin" ? answering.id : null}
        open={answering?.type === "mood_water_checkin"}
        onDone={closeDialog}
      />
    </div>
  );
}

const sum = (rows: { value: number }[]) => rows.reduce((acc, row) => acc + row.value, 0);
