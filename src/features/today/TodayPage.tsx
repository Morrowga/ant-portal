/**
 * Today — the portal's core loop, rebuilt from the mobile Today screen with
 * the location features removed per scope: no GPS, no tracking indicator,
 * no "working outside today" flow. Check-in/out send no coordinates (the
 * backend accepts that — same path as mobile without location permission).
 *
 * Kept: live clock + shift window, late/on-time badge, the 15-minute
 * early-check-in block, break start/end with a running timer, the mandatory
 * sleep question fired by check-in (blocking dialog), the checkout→report
 * gate (redirects to the report form in checkout mode), the bell with unread
 * count (in the shell), and the "This week" summary.
 *
 * Presence check: shows as a blocking dialog based on
 * status.pending_presence_check_id (from GET /attendance/me/status, which
 * this page already polls every 60s) -- NOT from a push-message event.
 * This means it correctly reappears on page reload/every poll until
 * actually answered, rather than depending on a transient notification
 * click that's lost the moment the tab reloads. There is no separate
 * presence-check route/page anymore -- it only ever shows here, on Today.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, errorDetail } from "@/lib/api-client";
import { fmtClock, fmtElapsed, fmtMinutes, fmtTimezone } from "@/lib/format";
import type {
  AttendanceStatus, CheckInResponse, CheckOutResponse, Me, Recognition, Report, ShiftStatus,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorText, SectionTitle, StatRow } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";
import { PresenceCheckModal } from "@/components/shared/PresenceCheckModal";
import { SleepCheckinDialog } from "@/features/health/checkin-dialogs";

const DAY_MS = 24 * 60 * 60 * 1000;

export function TodayPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<Me>("/me")).data,
  });

  const status = useQuery({
    queryKey: ["attendance", "status"],
    queryFn: async () => (await api.get<AttendanceStatus>("/attendance/me/status")).data,
    refetchInterval: 60_000,
  });
  const shift = useQuery({
    queryKey: ["attendance", "shift-status"],
    queryFn: async () => (await api.get<ShiftStatus>("/attendance/me/shift-status")).data,
    refetchInterval: 60_000,
  });
  const reports = useQuery({
    queryKey: ["reports", "me"],
    queryFn: async () => (await api.get<Report[]>("/reports/me")).data,
  });
  const kudos = useQuery({
    queryKey: ["recognitions", "me"],
    queryFn: async () => (await api.get<Recognition[]>("/recognitions/me")).data,
  });

  // Live clock — per-second tick drives both the clock and the break timer.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sleepPromptId, setSleepPromptId] = useState<number | null>(null);

  // Mirrors the backend's own 15-minute early-check-in window — the button
  // disables proactively instead of letting the click fail. Part-time has
  // no shift-time restrictions at all (see AttendanceService.check_in()),
  // so these are forced false regardless of the raw shift numbers, which
  // still get computed server-side as a fallback but don't apply here.
  const isPartTime = shift.data?.job_type === "part_time";
  const tooEarlyToCheckIn =
    !isPartTime &&
    shift.data?.minutes_until_start !== null &&
    shift.data?.minutes_until_start !== undefined &&
    shift.data.minutes_until_start > 15;
  // New: today's whole shift window has already closed -- checking in
  // hours after the shift ended doesn't correspond to any real shift left
  // to work, so this blocks it entirely, same as the backend's own check
  // (and the same fix just applied to mobile). Doesn't apply to part-time.
  const shiftEnded = !isPartTime && shift.data?.shift_has_ended === true;

  const checkIn = useMutation({
    mutationFn: async () => {
      setError(null); setNotice(null);
      // No GPS on web: check-in goes up with no coordinates, by design.
      return (await api.post<CheckInResponse>("/attendance/check-in", {})).data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      if (typeof data.late_minutes === "number" && data.late_minutes > 0) {
        setNotice(`You checked in ${fmtMinutes(data.late_minutes)} late.`);
      }
      // Mandatory sleep question — blocking dialog, the only way out is answering.
      if (data.sleep_prompt_id) setSleepPromptId(Number(data.sleep_prompt_id));
    },
    onError: (e) => setError(errorDetail(e)),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      setError(null); setNotice(null);
      return (await api.post<CheckOutResponse>("/attendance/check-out")).data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      if (typeof data.early_checkout_minutes === "number" && data.early_checkout_minutes > 0) {
        setNotice(`You checked out ${fmtMinutes(data.early_checkout_minutes)} early.`);
      }
    },
    onError: (e) => {
      const detail = errorDetail(e);
      // The checkout→report gate: no report yet → the report form takes over
      // in checkout mode and performs the real check-out after submitting.
      if (detail.includes("Submit today's report before checking out")) {
        navigate("/portal/reports/new?forCheckout=1");
        return;
      }
      setError(detail);
    },
  });

  const startBreak = useMutation({
    mutationFn: () => api.post("/attendance/break/start"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", "status"] }),
    onError: (e) => setError(errorDetail(e)),
  });
  const endBreak = useMutation({
    mutationFn: () => api.post("/attendance/break/end"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", "status"] }),
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Hi{me.data?.full_name ? `, ${me.data.full_name.split(" ")[0]}` : ""}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {now.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
      </p>

      {/* Live clock + shift window */}
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center py-6">
          <p className="font-display text-5xl font-semibold text-espresso tabular">
            {now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <QueryBoundary query={shift}>
            {(s) => s.job_type === "part_time" ? (
              <p className="mt-2 text-xs text-muted-foreground">Flexible hours — no fixed shift window</p>
            ) : (
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Shift: {s.shift_start_local} – {s.shift_end_local} ({fmtTimezone(s.employee_timezone)})
                </p>
                {status.data?.checked_in
                  ? s.minutes_until_end !== null && s.minutes_until_end > 0 && (
                      <p className="mt-1 text-[13px] font-medium">{fmtMinutes(s.minutes_until_end)} left in your shift</p>
                    )
                  : s.minutes_until_start !== null && s.minutes_until_start > 0 && (
                      <p className="mt-1 text-[13px] font-medium">Shift starts in {fmtMinutes(s.minutes_until_start)}</p>
                    )}
              </div>
            )}
          </QueryBoundary>
        </CardContent>
      </Card>

      <QueryBoundary query={status}>
        {(data) => (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {/* Session card */}
            <Card>
              <CardContent className="p-5">
                {data.checked_in ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="font-display text-lg font-semibold text-espresso">On the clock</p>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      since {data.check_in_at ? fmtClock(data.check_in_at) : "…"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!isPartTime && shift.data?.is_late ? (
                        <Badge variant="destructive">{fmtMinutes(shift.data.minutes_late ?? 0)} late</Badge>
                      ) : !isPartTime && shift.data?.is_late === false ? (
                        <Badge variant="success">on time</Badge>
                      ) : null}
                    </div>
                    <Button className="mt-4 w-full" disabled={checkOut.isPending} onClick={() => checkOut.mutate()}>
                      {checkOut.isPending ? "Checking out…" : "Check out"}
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Checking out asks for today's report first if you haven't submitted one.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-lg font-semibold">Off the clock</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {data.report_submitted_today
                        ? "Today's report is already submitted — see you tomorrow."
                        : isPartTime
                          ? "Checking in starts your attendance session. You can check in once per day."
                          : shiftEnded
                            ? "Today's shift has already ended — check-in is no longer available for today."
                            : tooEarlyToCheckIn
                              ? `Check-in opens 15 minutes before your shift — ${fmtMinutes((shift.data?.minutes_until_start ?? 0) - 15)} to go.`
                              : "Checking in starts your attendance session."}
                    </p>
                    <Button
                      className="mt-4 w-full"
                      disabled={data.report_submitted_today || tooEarlyToCheckIn || shiftEnded || checkIn.isPending}
                      onClick={() => checkIn.mutate()}
                    >
                      {checkIn.isPending ? "Checking in…" : "Check in"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Break card — only meaningful during a session */}
            {data.checked_in && (
              <Card>
                <CardContent className="p-5">
                  {data.on_break ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-display text-lg font-semibold">On break</p>
                        <Badge variant="warning">on break</Badge>
                      </div>
                      <p className="mt-1 font-display text-3xl font-semibold tabular">
                        {data.break_started_at ? fmtElapsed(now, new Date(data.break_started_at)) : "00:00"}
                      </p>
                      <Button className="mt-4 w-full" disabled={endBreak.isPending} onClick={() => endBreak.mutate()}>
                        End break
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Break time</p>
                        <p className="text-[13px] text-muted-foreground">
                          {data.total_break_minutes_today > 0
                            ? `${fmtMinutes(data.total_break_minutes_today)} today`
                            : "none yet today"}
                        </p>
                      </div>
                      <Button variant="outline" className="mt-4 w-full" disabled={startBreak.isPending} onClick={() => startBreak.mutate()}>
                        Start break
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">Break time is excluded from your credited hours.</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </QueryBoundary>

      {notice && (
        <Card className="mt-3 flex-row items-center justify-between bg-[#dcebd9]">
          <CardContent className="flex items-center justify-between px-4 py-3">
            <p className="flex-1 text-[13px] text-emerald-800">{notice}</p>
            <button className="pl-3 text-sm font-semibold text-emerald-800" onClick={() => setNotice(null)} aria-label="Dismiss">
              ✕
            </button>
          </CardContent>
        </Card>
      )}
      {error && <ErrorText>{error}</ErrorText>}

      <div className="mt-5 flex flex-wrap gap-2">
        <QuickLink to="/portal/leave" label="Leave" />
        <QuickLink to="/portal/overtime" label="Overtime" />
        <QuickLink to="/portal/settings?tab=attendance" label="History" />
        <QuickLink to="/portal/settings?tab=kudos" label="Kudos" />
      </div>

      <WeekSummary reports={reports.data ?? []} kudosCount={kudos.data?.length ?? 0} />

      <SleepCheckinDialog
        blocking
        promptId={sleepPromptId}
        open={sleepPromptId !== null}
        onDone={() => setSleepPromptId(null)}
      />

      {/* Presence check -- based on real polled status, not a push event.
          Shows whenever status.pending_presence_check_id is set, and
          reappears on every reload/poll until actually answered. */}
      {status.data?.pending_presence_check_id && (
        <PresenceCheckModal
          promptId={String(status.data.pending_presence_check_id)}
          onAnswered={() => qc.invalidateQueries({ queryKey: ["attendance", "status"] })}
        />
      )}
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full border border-line bg-card px-4 py-1.5 text-[13px] font-medium text-espresso transition-colors hover:bg-muted"
    >
      {label}
    </Link>
  );
}

/** Same client-side computation as mobile — from already-fetched data. */
function WeekSummary({ reports, kudosCount }: { reports: Report[]; kudosCount: number }) {
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * DAY_MS;
    const thisWeek = reports.filter((r) => new Date(r.report_date).getTime() >= weekAgo);
    const hoursThisWeek = thisWeek.reduce((sum, r) => sum + r.hours, 0);
    return {
      reportsThisWeek: thisWeek.length,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      avgHoursPerDay: thisWeek.length ? Math.round((hoursThisWeek / thisWeek.length) * 10) / 10 : 0,
    };
  }, [reports]);

  return (
    <>
      <SectionTitle>This week</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2">
        <StatRow label="Reports submitted" value={String(stats.reportsThisWeek)} />
        <StatRow label="Hours logged" value={`${stats.hoursThisWeek}h`} />
        <StatRow label="Average per day" value={`${stats.avgHoursPerDay}h`} />
        <StatRow label="Kudos received" value={String(kudosCount)} />
      </div>
    </>
  );
}