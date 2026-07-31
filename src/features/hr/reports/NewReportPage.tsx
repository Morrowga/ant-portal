/**
 * Multi-entry daily report — POST /reports takes an ARRAY of entries.
 * Reached normally OR in checkout mode (?forCheckout=1, sent by Today when
 * check-out is rejected for having no report): actual worked minutes become
 * a hard ceiling on the entered total, the "Today invoice" dialog is
 * available, "Nothing to report" is hidden (it can't satisfy the gate), and
 * a successful submit performs the real check-out.
 *
 * If any health check-in is pending, the form is replaced by an answer-first
 * card with the check-in opening as a dialog ON THIS PAGE — nothing typed is
 * ever lost (same fix the mobile app made).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api, errorDetail } from "@/lib/api-client";
import { fmtMinutes, toDecimalHours } from "@/lib/format";
import type { AttendanceStatus, CheckinPrompt, Project, TodayInvoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Chip, ErrorText } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";
import { MoodWaterCheckinDialog, SleepCheckinDialog } from "@/features/hr/health/checkin-dialogs";

interface Entry { project_id: number | null; hours: string; minutes: string; summary: string }

export function NewReportPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const isForCheckout = params.get("forCheckout") === "1" || params.get("forCheckout") === "true";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const pending = useQuery({
    queryKey: ["health", "prompts", "pending"],
    queryFn: async () => (await api.get<CheckinPrompt[]>("/health/prompts/pending")).data,
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });
  const status = useQuery({
    queryKey: ["attendance", "status"],
    queryFn: async () => (await api.get<AttendanceStatus>("/attendance/me/status")).data,
    enabled: isForCheckout, // the ceiling only matters in checkout mode
  });

  const [entries, setEntries] = useState<Entry[]>([{ project_id: null, hours: "", minutes: "", summary: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [answering, setAnswering] = useState<CheckinPrompt | null>(null);

  const invoice = useQuery({
    queryKey: ["attendance", "today-invoice"],
    queryFn: async () => (await api.get<TodayInvoice>("/attendance/me/today-invoice")).data,
    enabled: isForCheckout && invoiceOpen,
  });

  const update = (i: number, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((entry, j) => (j === i ? { ...entry, ...patch } : entry)));

  // New: removes one entry by index. Always keeps at least one entry --
  // the remove button itself is hidden when there's only one (see below),
  // but this guard stays as a second line of defense regardless of how
  // it's called.
  const removeEntry = (i: number) =>
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));

  const actualMinutes = status.data?.actual_working_minutes_today ?? null;
  const totalEnteredHours = entries.reduce((sum, e) => sum + toDecimalHours(e.hours, e.minutes), 0);
  const overCeiling = isForCheckout && actualMinutes !== null && totalEnteredHours > actualMinutes / 60 + 0.01;

  const submit = useMutation({
    mutationFn: async () => {
      setError(null);
      const body = entries.map((entry) => ({
        project_id: entry.project_id,
        hours: toDecimalHours(entry.hours, entry.minutes),
        summary: entry.summary.trim(),
      }));
      await api.post("/reports", body);
      // The whole point of checkout mode: submit, then the real check-out.
      if (isForCheckout) await api.post("/attendance/check-out");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      navigate(isForCheckout ? "/ants-office" : "/ants-office/reports", { replace: isForCheckout });
    },
    onError: (e) => setError(errorDetail(e)),
  });

  const nothingToReport = useMutation({
    mutationFn: () => api.post("/reports/no-project-today"),
    onSuccess: () => navigate("/ants-office/reports"),
    onError: (e) => setError(errorDetail(e)),
  });

  const valid =
    entries.every((entry) => toDecimalHours(entry.hours, entry.minutes) > 0 && entry.summary.trim().length > 0) &&
    !overCeiling;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold">{isForCheckout ? t("features.newReport.finishCheckingOut") : t("features.newReport.newReport")}</h1>

      <QueryBoundary query={pending}>
        {(prompts) =>
          prompts.length > 0 ? (
            // Answer-first gate: the form itself is hidden until every
            // pending check-in is answered; the dialog opens right here.
            <Card className="mt-4">
              <CardContent className="flex flex-col items-center py-8 text-center">
                <p className="font-display text-lg font-semibold">{t("features.newReport.answerHealthFirst")}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {prompts.length > 1
                    ? t("features.newReport.multiplePending", { count: prompts.length })
                    : t("features.newReport.singlePending")}
                </p>
                <Button className="mt-4" onClick={() => setAnswering(prompts[0])}>{t("features.newReport.answerNow")}</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {isForCheckout && (
                <Card className="mt-4 border-latte bg-latte/30">
                  <CardContent className="px-4 py-3">
                    <p className="text-[13px] font-medium text-espresso">
                      {actualMinutes !== null
                        ? t("features.newReport.actualWorkedNote", { time: fmtMinutes(actualMinutes) })
                        : t("features.newReport.fillOutToFinish")}
                    </p>
                  </CardContent>
                </Card>
              )}

              {entries.map((entry, i) => (
                <Card key={i} className="mt-3">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("features.newReport.entryNumber", { number: i + 1 })}
                      </p>
                      {/* New: remove this entry -- hidden entirely when
                          it's the only one, since at least one entry is
                          always required to submit. */}
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={t("features.newReport.removeEntry")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Label className="mb-1.5 block">{t("features.newReport.project")}</Label>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(projects.data ?? []).map((project) => (
                        <Chip
                          key={project.id}
                          label={project.name}
                          selected={entry.project_id === project.id}
                          onClick={() => update(i, { project_id: project.id })}
                        />
                      ))}
                      {/* New: visible fallback instead of silently
                          rendering nothing when there are no projects --
                          makes an empty list diagnosable (a real "no
                          projects exist" state) rather than looking
                          identical to a broken/missing section. */}
                      {projects.isSuccess && (projects.data ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground">{t("features.newReport.noProjectsAvailable")}</p>
                      )}
                    </div>
                    <Label className="mb-1.5 block">{t("features.newReport.timeSpent")}</Label>
                    <div className="mb-3 flex gap-2">
                      <div className="flex-1">
                        <Input
                          inputMode="numeric"
                          value={entry.hours}
                          onChange={(e) => update(i, { hours: e.target.value.replace(/[^0-9]/g, "") })}
                          placeholder="0"
                          aria-label={t("features.newReport.hoursAriaLabel")}
                        />
                        <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("features.newReport.hoursUnit")}</p>
                      </div>
                      <div className="flex-1">
                        <Input
                          inputMode="numeric"
                          value={entry.minutes}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, "");
                            update(i, { minutes: digits === "" ? "" : String(Math.min(59, Number(digits))) });
                          }}
                          placeholder="0"
                          aria-label={t("features.newReport.minutesAriaLabel")}
                        />
                        <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("features.newReport.minutesUnit")}</p>
                      </div>
                    </div>
                    <Label className="mb-1.5 block" htmlFor={`summary-${i}`}>{t("features.newReport.whatDidYouWorkOn")}</Label>
                    <Textarea
                      id={`summary-${i}`}
                      value={entry.summary}
                      onChange={(e) => update(i, { summary: e.target.value })}
                      placeholder={t("features.newReport.summaryPlaceholder")}
                    />
                  </CardContent>
                </Card>
              ))}

              {overCeiling && (
                <ErrorText>
                  {t("features.newReport.overCeiling", {
                    entered: fmtMinutes(Math.round(totalEnteredHours * 60)),
                    actual: actualMinutes !== null ? fmtMinutes(actualMinutes) : "?",
                  })}
                </ErrorText>
              )}
              {error && <ErrorText>{error}</ErrorText>}

              <div className="mt-3 flex gap-2">
                {isForCheckout && (
                  <Button variant="outline" className="flex-1" onClick={() => setInvoiceOpen(true)}>
                    {t("features.newReport.todayInvoice")}
                  </Button>
                )}
                <Button
                  variant="outline" className="flex-1"
                  onClick={() => setEntries((prev) => [...prev, { project_id: null, hours: "", minutes: "", summary: "" }])}
                >
                  {t("features.newReport.addAnotherEntry")}
                </Button>
              </div>
              <Button className="mt-3 w-full" disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? t("features.newReport.submitting") : isForCheckout ? t("features.newReport.submitAndCheckOut") : t("features.newReport.submitReport")}
              </Button>

              {/* "Nothing to report" can't satisfy the checkout gate — hidden there. */}
              {!isForCheckout && (
                <div className="mt-6 border-t pt-4 text-center">
                  <Button variant="ghost" disabled={nothingToReport.isPending} onClick={() => nothingToReport.mutate()}>
                    {t("features.newReport.nothingToReport")}
                  </Button>
                </div>
              )}
            </>
          )
        }
      </QueryBoundary>

      <TodayInvoiceDialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} invoice={invoice.data} loading={invoice.isLoading} />

      <SleepCheckinDialog
        promptId={answering?.type === "sleep_checkin" ? answering.id : null}
        open={answering?.type === "sleep_checkin"}
        onDone={() => { setAnswering(null); qc.invalidateQueries({ queryKey: ["health", "prompts"] }); }}
      />
      <MoodWaterCheckinDialog
        promptId={answering?.type === "mood_water_checkin" ? answering.id : null}
        open={answering?.type === "mood_water_checkin"}
        onDone={() => { setAnswering(null); qc.invalidateQueries({ queryKey: ["health", "prompts"] }); }}
      />
    </div>
  );
}

function TodayInvoiceDialog({ open, onClose, invoice, loading }: {
  open: boolean; onClose: () => void; invoice: TodayInvoice | undefined; loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("features.newReport.invoiceDialog.title")}</DialogTitle></DialogHeader>
        {loading || !invoice ? (
          <p className="text-sm text-muted-foreground">{t("features.newReport.invoiceDialog.loading")}</p>
        ) : (
          <div>
            <InvoiceRow label={t("features.newReport.invoiceDialog.scheduledShift")} value={fmtMinutes(invoice.scheduled_minutes)} />
            <InvoiceRow label={t("features.newReport.invoiceDialog.timeCheckedIn")} value={fmtMinutes(invoice.elapsed_minutes)} />
            <InvoiceRow label={t("features.newReport.invoiceDialog.breakTimeExcluded")} value={`− ${fmtMinutes(invoice.break_minutes)}`} muted />
            <InvoiceRow
              label={t("features.newReport.invoiceDialog.lateArrival")}
              value={invoice.late_minutes > 0 ? fmtMinutes(invoice.late_minutes) : t("features.newReport.invoiceDialog.none")}
              muted
            />
            {invoice.deductions_enabled ? (
              <InvoiceRow
                label={t("features.newReport.invoiceDialog.unansweredPresenceChecks")}
                value={invoice.no_response_minutes > 0 ? `− ${fmtMinutes(invoice.no_response_minutes)}` : t("features.newReport.invoiceDialog.none")}
                muted={invoice.no_response_minutes === 0}
              />
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t("features.newReport.invoiceDialog.deductionsOffNote")}</p>
            )}
            <div className="mt-3 border-t pt-3">
              <InvoiceRow label={t("features.newReport.invoiceDialog.creditedHours")} value={fmtMinutes(invoice.credited_minutes)} bold />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceRow({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className={`text-[13px] ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-[13px] tabular ${bold ? "font-semibold" : muted ? "text-muted-foreground" : ""}`}>{value}</span>
    </div>
  );
}