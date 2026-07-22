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
import { useState } from "react";
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
import { MoodWaterCheckinDialog, SleepCheckinDialog } from "@/features/health/checkin-dialogs";

interface Entry { project_id: number | null; hours: string; minutes: string; summary: string }

export function NewReportPage() {
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
      navigate(isForCheckout ? "/portal" : "/portal/reports", { replace: isForCheckout });
    },
    onError: (e) => setError(errorDetail(e)),
  });

  const nothingToReport = useMutation({
    mutationFn: () => api.post("/reports/no-project-today"),
    onSuccess: () => navigate("/portal/reports"),
    onError: (e) => setError(errorDetail(e)),
  });

  const valid =
    entries.every((entry) => toDecimalHours(entry.hours, entry.minutes) > 0 && entry.summary.trim().length > 0) &&
    !overCeiling;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold">{isForCheckout ? "Finish checking out" : "New report"}</h1>

      <QueryBoundary query={pending}>
        {(prompts) =>
          prompts.length > 0 ? (
            // Answer-first gate: the form itself is hidden until every
            // pending check-in is answered; the dialog opens right here.
            <Card className="mt-4">
              <CardContent className="flex flex-col items-center py-8 text-center">
                <p className="font-display text-lg font-semibold">Answer your health check-in first</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {prompts.length > 1
                    ? `You have ${prompts.length} unanswered check-ins today.`
                    : "Just one quick question, then the report form appears right here."}
                </p>
                <Button className="mt-4" onClick={() => setAnswering(prompts[0])}>Answer now</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {isForCheckout && (
                <Card className="mt-4 border-latte bg-latte/30">
                  <CardContent className="px-4 py-3">
                    <p className="text-[13px] font-medium text-espresso">
                      {actualMinutes !== null
                        ? `You've actually worked ${fmtMinutes(actualMinutes)} today (breaks excluded). Log your tasks below — the total can be less, but not more.`
                        : "Fill out today's report to finish checking out."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {entries.map((entry, i) => (
                <Card key={i} className="mt-3">
                  <CardContent className="p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Entry {i + 1}
                    </p>
                    <Label className="mb-1.5 block">Project</Label>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(projects.data ?? []).map((project) => (
                        <Chip
                          key={project.id}
                          label={project.name}
                          selected={entry.project_id === project.id}
                          onClick={() => update(i, { project_id: project.id })}
                        />
                      ))}
                    </div>
                    <Label className="mb-1.5 block">Time spent</Label>
                    <div className="mb-3 flex gap-2">
                      <div className="flex-1">
                        <Input
                          inputMode="numeric"
                          value={entry.hours}
                          onChange={(e) => update(i, { hours: e.target.value.replace(/[^0-9]/g, "") })}
                          placeholder="0"
                          aria-label="Hours"
                        />
                        <p className="mt-1 text-center text-[11px] text-muted-foreground">hours</p>
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
                          aria-label="Minutes"
                        />
                        <p className="mt-1 text-center text-[11px] text-muted-foreground">minutes</p>
                      </div>
                    </div>
                    <Label className="mb-1.5 block" htmlFor={`summary-${i}`}>What did you work on?</Label>
                    <Textarea
                      id={`summary-${i}`}
                      value={entry.summary}
                      onChange={(e) => update(i, { summary: e.target.value })}
                      placeholder="A few sentences — this is what your manager (and the pace analysis) reads."
                    />
                  </CardContent>
                </Card>
              ))}

              {overCeiling && (
                <ErrorText>
                  Total entered ({fmtMinutes(Math.round(totalEnteredHours * 60))}) is more than your actual working
                  hours ({actualMinutes !== null ? fmtMinutes(actualMinutes) : "?"}). Reduce your entries to fit.
                </ErrorText>
              )}
              {error && <ErrorText>{error}</ErrorText>}

              <div className="mt-3 flex gap-2">
                {isForCheckout && (
                  <Button variant="outline" className="flex-1" onClick={() => setInvoiceOpen(true)}>
                    Today invoice
                  </Button>
                )}
                <Button
                  variant="outline" className="flex-1"
                  onClick={() => setEntries((prev) => [...prev, { project_id: null, hours: "", minutes: "", summary: "" }])}
                >
                  Add another entry
                </Button>
              </div>
              <Button className="mt-3 w-full" disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? "Submitting…" : isForCheckout ? "Submit & check out" : "Submit report"}
              </Button>

              {/* "Nothing to report" can't satisfy the checkout gate — hidden there. */}
              {!isForCheckout && (
                <div className="mt-6 border-t pt-4 text-center">
                  <Button variant="ghost" disabled={nothingToReport.isPending} onClick={() => nothingToReport.mutate()}>
                    Nothing to report today
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
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Today's invoice</DialogTitle></DialogHeader>
        {loading || !invoice ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div>
            <InvoiceRow label="Scheduled shift" value={fmtMinutes(invoice.scheduled_minutes)} />
            <InvoiceRow label="Time checked in" value={fmtMinutes(invoice.elapsed_minutes)} />
            <InvoiceRow label="Break time (excluded)" value={`− ${fmtMinutes(invoice.break_minutes)}`} muted />
            <InvoiceRow label="Late arrival" value={invoice.late_minutes > 0 ? fmtMinutes(invoice.late_minutes) : "none"} muted />
            {invoice.deductions_enabled ? (
              <InvoiceRow
                label="Unanswered presence checks"
                value={invoice.no_response_minutes > 0 ? `− ${fmtMinutes(invoice.no_response_minutes)}` : "none"}
                muted={invoice.no_response_minutes === 0}
              />
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No-response deductions are turned off by your company.</p>
            )}
            <div className="mt-3 border-t pt-3">
              <InvoiceRow label="Credited hours" value={fmtMinutes(invoice.credited_minutes)} bold />
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
