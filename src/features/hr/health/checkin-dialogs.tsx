/**
 * The two health check-in dialogs, shared by Today (mandatory sleep question
 * fired by check-in), Health (Reminders list), and the report form's
 * answer-first gate. The sleep dialog renders in BLOCKING mode when reached
 * from check-in — no X, no outside-click, no Escape: the only way out is
 * answering, mirroring the mobile app's swallowed back button.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Droplet, Smile } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api, errorDetail } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorText } from "@/components/shared/bits";

/** labelKey resolves under features.healthCheckin.sleepOptions.* */
const SLEEP_OPTIONS = [
  { labelKey: "lessThan5", hours: 4 },
  { labelKey: "fiveToSix", hours: 5.5 },
  { labelKey: "sixToSeven", hours: 6.5 },
  { labelKey: "sevenToEight", hours: 7.5 },
  { labelKey: "eightPlus", hours: 8.5 },
] as const;

export function SleepCheckinDialog({ promptId, open, onDone, blocking = false }: {
  promptId: number | null; open: boolean; onDone: () => void; blocking?: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: (hours: number) =>
      api.post("/health/sleep", { hours, prompt_id: promptId ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health"] });
      setDone(true);
      setTimeout(() => { setDone(false); onDone(); }, 700);
    },
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !blocking) onDone(); }}>
      <DialogContent blocking={blocking} className="max-w-md">
        {done ? (
          <div className="flex flex-col items-center py-8">
            <span className="text-4xl">✓</span>
            <p className="mt-3 font-display font-semibold text-espresso">{t("features.healthCheckin.logged")}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("features.healthCheckin.sleepQuestion")}</DialogTitle>
              <DialogDescription>
                {t("features.healthCheckin.sleepPrivacyNote")}
                {blocking && ` ${t("features.healthCheckin.requiredToContinue")}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {SLEEP_OPTIONS.map((option) => (
                <Button
                  key={option.labelKey}
                  variant="outline"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate(option.hours)}
                >
                  {submit.isPending && submit.variables === option.hours
                    ? t("features.healthCheckin.saving")
                    : t(`features.healthCheckin.sleepOptions.${option.labelKey}`)}
                </Button>
              ))}
            </div>
            {error && <ErrorText>{error}</ErrorText>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const WATER_OPTIONS = [100, 200, 300, 500];
/** labelKey resolves under features.healthCheckin.moodOptions.* */
const MOOD_OPTIONS = [
  { value: 5, emoji: "😄", labelKey: "great" },
  { value: 4, emoji: "🙂", labelKey: "good" },
  { value: 3, emoji: "😐", labelKey: "okay" },
  { value: 2, emoji: "😕", labelKey: "low" },
  { value: 1, emoji: "😣", labelKey: "rough" },
] as const;

/** One combined survey — both questions, one Submit (fired every ~2h
 *  during an active session by the backend's reminder job). */
export function MoodWaterCheckinDialog({ promptId, open, onDone }: {
  promptId: number | null; open: boolean; onDone: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [waterMl, setWaterMl] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => { setWaterMl(null); setMood(null); setError(null); };

  const submit = useMutation({
    mutationFn: async () => {
      await api.post("/health/water", { ml: waterMl, prompt_id: promptId ?? undefined });
      await api.post("/health/mood", { mood, prompt_id: promptId ?? undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health"] });
      setDone(true);
      setTimeout(() => { setDone(false); reset(); onDone(); }, 800);
    },
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); onDone(); } }}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="flex flex-col items-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-latte-deep text-3xl">✓</div>
            <p className="mt-4 font-display text-lg text-espresso">{t("features.healthCheckin.thanksLogged")}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("features.healthCheckin.quickCheckin")}</DialogTitle>
              <DialogDescription>{t("features.healthCheckin.twoQuestionsNote")}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border bg-cream/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf2f3]">
                  <Droplet className="h-4 w-4 text-[#3d7a85]" />
                </span>
                <p className="text-sm font-semibold">{t("features.healthCheckin.waterQuestion")}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {WATER_OPTIONS.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => setWaterMl(ml)}
                    className={cn(
                      "min-w-[70px] flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                      waterMl === ml ? "border-espresso bg-espresso text-cream" : "border-line bg-card hover:bg-muted",
                    )}
                  >
                    {t("features.healthCheckin.mlValue", { value: ml })}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-cream/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3e9de]">
                  <Smile className="h-4 w-4 text-copper" />
                </span>
                <p className="text-sm font-semibold">{t("features.healthCheckin.moodQuestion")}</p>
              </div>
              <div className="mt-4 flex justify-between">
                {MOOD_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setMood(option.value)} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-colors",
                        mood === option.value ? "bg-latte-deep shadow" : "bg-cream hover:bg-muted",
                      )}
                    >
                      {option.emoji}
                    </span>
                    <span className={cn("text-[11px]", mood === option.value ? "font-semibold text-espresso" : "text-muted-foreground")}>
                      {t(`features.healthCheckin.moodOptions.${option.labelKey}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <Button disabled={waterMl === null || mood === null || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? t("features.healthCheckin.saving") : t("features.healthCheckin.submit")}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}