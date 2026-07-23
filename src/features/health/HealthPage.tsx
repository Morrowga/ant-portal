/**
 * Personal health — SELF-ONLY by design. The prompt-driven check-in flow is
 * the primary content: pending reminders open their dialog right here, the
 * disappearance from the list is the success confirmation.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api-client";
import type { CheckinPrompt, HealthDashboard } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyText, SectionTitle, StatRow } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

import { MoodWaterCheckinDialog, SleepCheckinDialog } from "./checkin-dialogs";

/** labelKey resolves under features.health.promptTypes.* */
const PROMPT_LABEL_KEY: Record<CheckinPrompt["type"], string> = {
  sleep_checkin: "sleepCheckin",
  mood_water_checkin: "moodWaterCheckin",
};

export function HealthPage() {
  const { t, i18n } = useTranslation();
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
      <h1 className="text-xl font-semibold">{t("features.health.pageTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("features.health.pageDescription")}
      </p>

      <SectionTitle>{t("features.health.reminders")}</SectionTitle>
      <QueryBoundary query={pending}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  {t("features.health.allCaughtUp")}
                </CardContent>
              </Card>
            )}
            {rows.map((prompt) => (
              <button key={prompt.id} className="block w-full text-left" onClick={() => setAnswering(prompt)}>
                <Card className="border-copper/40 bg-copper/5 transition-colors hover:bg-copper/10">
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-espresso">{t(`features.health.promptTypes.${PROMPT_LABEL_KEY[prompt.type]}`)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("features.health.clickToAnswer")}</p>
                    </div>
                    <Badge variant="warning">{t("features.health.unanswered")}</Badge>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </QueryBoundary>

      <SectionTitle>{t("features.health.todaysCheckins")}</SectionTitle>
      <QueryBoundary query={todaysPrompts}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && (
              <EmptyText>{t("features.health.noRemindersSentYet")}</EmptyText>
            )}
            {rows.map((prompt) => (
              <Card key={prompt.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm">{t(`features.health.promptTypes.${PROMPT_LABEL_KEY[prompt.type]}`)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(prompt.sent_at).toLocaleTimeString(i18n.language, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant={prompt.responded_at ? "success" : "warning"}>
                    {prompt.responded_at ? t("features.health.answered") : t("features.health.unanswered")}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <SectionTitle>{t("features.health.thisWeek")}</SectionTitle>
      <QueryBoundary query={dashboard}>
        {(data) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <StatRow label={t("features.health.avgWaterPerDay")} value={t("features.health.mlValue", { value: Math.round(sum(data.water) / 7) })} />
            <StatRow label={t("features.health.avgMood")} value={data.mood.length ? t("features.health.moodValue", { value: (sum(data.mood) / data.mood.length).toFixed(1) }) : "—"} />
            <StatRow label={t("features.health.avgSleepPerDay")} value={data.sleep.length ? t("features.health.hoursValue", { value: (sum(data.sleep) / 7).toFixed(1) }) : "—"} />
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