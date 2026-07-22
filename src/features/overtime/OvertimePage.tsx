/**
 * Overtime — full request → approval → start → mandatory closing report → end.
 * - Start is blocked client-side unless there's an APPROVED request for today
 *   that hasn't already been used (sessions carry request_id), AND the
 *   planned start time has arrived (spec: "blocked before planned time").
 * - There is deliberately no end-without-report path: the End button IS the
 *   closing-summary form, and /overtime/end only fires after the report.
 * - Past sessions use REAL pagination: useInfiniteQuery + a "Load more"
 *   button (the web equivalent of the mobile list's onEndReached).
 * - Overnight-spanning overtime IS allowed (e.g. 23:30 to 02:00) -- the
 *   request form no longer rejects endTime <= startTime, matching the
 *   backend's own relaxed validation. A "spans into tomorrow" hint shows
 *   whenever that's the case.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api, errorDetail } from "@/lib/api-client";
import { fmtClock, fmtDay, nowHHMM, todayStr } from "@/lib/format";
import type { Overtime, OvertimeRequest } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyText, ErrorText, SectionTitle } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

const PAGE_SIZE = 20;
const toDateOnly = (value: string) => value.slice(0, 10);

export function OvertimePage() {
  const qc = useQueryClient();

  const requests = useQuery({
    queryKey: ["overtime", "requests", "me"],
    queryFn: async () => (await api.get<OvertimeRequest[]>("/overtime/requests/me")).data,
  });
  // Open-session + used-request detection needs the full picture, not just
  // page 1 — a larger unpaginated slice, separate from the paginated list.
  const allSessionsForStatus = useQuery({
    queryKey: ["overtime", "all-for-status"],
    queryFn: async () => (await api.get<Overtime[]>("/overtime/me", { params: { limit: 200 } })).data,
  });

  const open = (allSessionsForStatus.data ?? []).find((s) => !s.end_at);
  const usedRequestIds = new Set(
    (allSessionsForStatus.data ?? []).map((s) => s.request_id).filter((id): id is number => id != null),
  );
  const approvedToday = (requests.data ?? []).find(
    (r) => r.status === "approved" && toDateOnly(r.requested_date) === todayStr() && !usedRequestIds.has(r.id),
  );
  const existingTodayRequest = (requests.data ?? []).find(
    (r) => toDateOnly(r.requested_date) === todayStr() && r.status !== "rejected" && !usedRequestIds.has(r.id),
  );
  // Spec: start is also blocked BEFORE the planned start time.
  const beforePlannedTime = !!approvedToday && nowHHMM() < approvedToday.planned_start_time;

  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ["overtime"] });

  const startSession = useMutation({
    mutationFn: () => api.post("/overtime/start", {}),
    onSuccess: invalidateAll,
    onError: (e) => setError(errorDetail(e)),
  });

  const reportThenEnd = useMutation({
    mutationFn: async () => {
      if (!open) return;
      // Report FIRST (mandatory), then end — never the other way around.
      await api.post(`/overtime/${open.id}/report`, { summary: summary.trim() });
      await api.post("/overtime/end");
    },
    onSuccess: () => { invalidateAll(); setSummary(""); },
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Overtime</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Overtime needs a request and approval before it can start, and always ends with a short report.
      </p>

      {/* State card: running > approved-for-today > nothing */}
      {open ? (
        <Card className="mt-4 border-espresso bg-espresso text-cream">
          <CardContent className="p-5">
            <p className="font-display text-lg font-semibold text-cream">Overtime running</p>
            <p className="mt-1 text-[13px] text-latte">since {fmtClock(open.start_at)}</p>
            {open.reason && <p className="mt-2 text-[13px] text-latte">Reason: {open.reason}</p>}
            <Label className="mb-1.5 mt-4 block text-latte">
              What did this overtime cover? (required to end the session)
            </Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A short closing report — this is mandatory, not optional."
              className="bg-cream/95 text-ink"
            />
            {error && <ErrorText>{error}</ErrorText>}
            <Button
              className="mt-3 w-full"
              disabled={summary.trim().length < 3 || reportThenEnd.isPending}
              onClick={() => reportThenEnd.mutate()}
            >
              {reportThenEnd.isPending ? "Closing…" : "Submit report & end overtime"}
            </Button>
          </CardContent>
        </Card>
      ) : approvedToday ? (
        <Card className="mt-4 border-espresso bg-espresso">
          <CardContent className="p-5">
            <p className="font-display text-lg font-semibold text-cream">Approved for today</p>
            <p className="mt-1 text-[13px] text-latte">
              {approvedToday.planned_start_time} – {approvedToday.planned_end_time} · {approvedToday.reason}
            </p>
            {beforePlannedTime && (
              <p className="mt-2 text-[13px] text-latte">
                Starts at {approvedToday.planned_start_time} — the button unlocks then.
              </p>
            )}
            {error && <ErrorText>{error}</ErrorText>}
            <Button
              className="mt-3 w-full"
              disabled={beforePlannedTime || startSession.isPending}
              onClick={() => startSession.mutate()}
            >
              {startSession.isPending ? "Starting…" : "Start overtime"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardContent className="p-5">
            <p className="font-display text-lg font-semibold">No approved overtime today</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Submit a request below for any day, including today — your manager approves it before you can start.
            </p>
          </CardContent>
        </Card>
      )}

      {existingTodayRequest ? (
        <>
          <SectionTitle>Request overtime</SectionTitle>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium">
                You already have {existingTodayRequest.status === "approved" ? "an approved" : "a pending"} request for today
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {existingTodayRequest.planned_start_time}–{existingTodayRequest.planned_end_time} · {existingTodayRequest.reason}
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <NewRequestForm onSubmitted={invalidateAll} />
      )}

      <Tabs defaultValue="requests" className="mt-8">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="requests">Your requests</TabsTrigger>
          <TabsTrigger value="sessions">Past sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <QueryBoundary query={requests}>
            {(rows) => (
              <div className="space-y-2">
                {rows.length === 0 && <EmptyText>No overtime requests yet.</EmptyText>}
                {rows.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium tabular">
                          {fmtDay(request.requested_date)} · {request.planned_start_time}–{request.planned_end_time}
                          {request.planned_end_time <= request.planned_start_time && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">(next day)</span>
                          )}
                        </p>
                        <Badge
                          variant={request.status === "approved" ? "success" : request.status === "rejected" ? "destructive" : "warning"}
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">{request.reason}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </QueryBoundary>
        </TabsContent>
        <TabsContent value="sessions">
          <PastSessions />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Paginated closed-session history: pages of 20 with an explicit Load more. */
function PastSessions() {
  const pages = useInfiniteQuery({
    queryKey: ["overtime", "sessions", "paginated"],
    queryFn: async ({ pageParam }) =>
      (await api.get<Overtime[]>("/overtime/me", { params: { limit: PAGE_SIZE, offset: pageParam } })).data,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    initialPageParam: 0,
  });

  if (pages.isPending) return <EmptyText>Loading…</EmptyText>;
  if (pages.isError) return <ErrorText>{errorDetail(pages.error)}</ErrorText>;

  const rows = (pages.data?.pages ?? []).flat().filter((session) => !!session.end_at);

  return (
    <div className="space-y-2">
      {rows.length === 0 && <EmptyText>No closed overtime sessions yet.</EmptyText>}
      {rows.map((session) => (
        <Link key={session.id} to={`/portal/overtime/${session.id}`} className="block">
          <Card className="transition-colors hover:bg-muted/40">
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{fmtDay(session.start_at)}</p>
                <Badge className="border-transparent bg-copper/10 text-copper tabular">{session.hours ?? "?"}h</Badge>
              </div>
              {session.reason && <p className="mt-1 text-[13px]">Reason: {session.reason}</p>}
              {session.summary && <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{session.summary}</p>}
            </CardContent>
          </Card>
        </Link>
      ))}
      {pages.hasNextPage && (
        <div className="pt-2 text-center">
          <Button variant="outline" disabled={pages.isFetchingNextPage} onClick={() => pages.fetchNextPage()}>
            {pages.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function NewRequestForm({ onSubmitted }: { onSubmitted: () => void }) {
  // Native HTML date/time inputs — the web replacement for the mobile
  // app's @react-native-community/datetimepicker.
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      api.post("/overtime/requests", {
        requested_date: date,
        planned_start_time: startTime,
        planned_end_time: endTime,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      setDate(""); setStartTime(""); setEndTime(""); setReason("");
      onSubmitted();
    },
    onError: (e) => setError(errorDetail(e)),
  });

  // New: endTime <= startTime is now VALID -- it means the overtime spans
  // into the next calendar day (e.g. 23:30 to 02:00), matching the
  // backend's own relaxed validation. Only reject the exact same time for
  // both (zero-length), everything else is a legitimate window.
  const spansNextDay = !!startTime && !!endTime && endTime <= startTime;
  const canSubmit = !!date && !!startTime && !!endTime && !!reason.trim() && startTime !== endTime;

  return (
    <>
      <SectionTitle>Request overtime</SectionTitle>
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="ot-date" className="mb-1.5 block">Date</Label>
              <Input id="ot-date" type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ot-start" className="mb-1.5 block">Start time</Label>
              <Input id="ot-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ot-end" className="mb-1.5 block">End time</Label>
              <Input id="ot-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {startTime && endTime && startTime === endTime && (
            <p className="mt-2 text-xs text-destructive">Start and end time can't be identical.</p>
          )}
          {spansNextDay && (
            <p className="mt-2 text-xs text-muted-foreground">
              This spans into the next day — ends at {endTime} the day after {date || "the selected date"}.
            </p>
          )}
          <Label htmlFor="ot-reason" className="mb-1.5 mt-3 block">Why do you need overtime?</Label>
          <Textarea
            id="ot-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Closing out the Q3 report before tomorrow's deadline"
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="mt-3" disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Sending…" : "Send request"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}