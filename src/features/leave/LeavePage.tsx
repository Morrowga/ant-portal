/** Leave — full-day range or partial-day (single date + start/end times),
 *  matching the mobile payload. Native date/time inputs replace the RN picker. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api, errorDetail } from "@/lib/api-client";
import type { LeaveRequest } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Chip, EmptyText, ErrorText, SectionTitle } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

const TYPES = ["annual", "sick", "unpaid", "other"];

export function LeavePage() {
  const qc = useQueryClient();
  const history = useQuery({
    queryKey: ["leave", "me"],
    queryFn: async () => (await api.get<LeaveRequest[]>("/leave-requests/me")).data,
  });
  const [type, setType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [partialDay, setPartialDay] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: () =>
      api.post("/leave-requests", {
        type,
        start_date: start,
        end_date: partialDay ? start : end,
        ...(partialDay && startTime && endTime && { start_time: startTime, end_time: endTime }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      setStart(""); setEnd(""); setStartTime(""); setEndTime("");
    },
    onError: (e) => setError(errorDetail(e)),
  });

  const canSubmit = partialDay
    ? !!start && !!startTime && !!endTime && startTime < endTime
    : !!start && !!end && start <= end;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Leave</h1>
      <SectionTitle>Request leave</SectionTitle>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} label={t} selected={type === t} onClick={() => setType(t)} />
            ))}
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg border bg-cream/60 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium">Just part of a day?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">e.g. 2 hours for a bank errand</p>
            </div>
            <Switch checked={partialDay} onCheckedChange={setPartialDay} />
          </div>

          {partialDay ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="lv-date" className="mb-1.5 block">Date</Label>
                <Input id="lv-date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lv-start-time" className="mb-1.5 block">From</Label>
                <Input id="lv-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lv-end-time" className="mb-1.5 block">Until</Label>
                <Input id="lv-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="lv-start" className="mb-1.5 block">First day</Label>
                <Input id="lv-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lv-end" className="mb-1.5 block">Last day</Label>
                <Input id="lv-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          )}
          {partialDay && startTime && endTime && startTime >= endTime && (
            <p className="mt-2 text-xs text-destructive">End time must be after the start time.</p>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="mt-4" disabled={!canSubmit || request.isPending} onClick={() => request.mutate()}>
            {request.isPending ? "Sending…" : "Send request"}
          </Button>
        </CardContent>
      </Card>

      <SectionTitle>Your requests</SectionTitle>
      <QueryBoundary query={history}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>No leave requests yet.</EmptyText>}
            {rows.map((leave) => (
              <Card key={leave.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{leave.type}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {leave.start_date}
                      {leave.start_time && leave.end_time
                        ? ` · ${leave.start_time}–${leave.end_time}`
                        : ` → ${leave.end_date}`}
                    </p>
                  </div>
                  <Badge variant={leave.status === "approved" ? "success" : leave.status === "rejected" ? "destructive" : "warning"}>
                    {leave.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
