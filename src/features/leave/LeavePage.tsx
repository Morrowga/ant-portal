/** Leave — full-day range or partial-day (single date + start/end times),
 *  matching the mobile payload. Native date/time inputs replace the RN picker. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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

// NOTE: values stay untranslated here (used as API values); only the CHIP
// LABEL shown to the user is translated, via features.leave.types.* --
// same pattern as feedback categories elsewhere in the codebase.
const TYPES = ["annual", "sick", "unpaid", "other"];

export function LeavePage() {
  const { t } = useTranslation();
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
      <h1 className="text-xl font-semibold">{t("features.leave.pageTitle")}</h1>
      <SectionTitle>{t("features.leave.requestLeave")}</SectionTitle>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {TYPES.map((typeValue) => (
              <Chip key={typeValue} label={t(`features.leave.types.${typeValue}`)} selected={type === typeValue} onClick={() => setType(typeValue)} />
            ))}
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg border bg-cream/60 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium">{t("features.leave.partialDayQuestion")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("features.leave.partialDayExample")}</p>
            </div>
            <Switch checked={partialDay} onCheckedChange={setPartialDay} />
          </div>

          {partialDay ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="lv-date" className="mb-1.5 block">{t("features.leave.date")}</Label>
                <Input id="lv-date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lv-start-time" className="mb-1.5 block">{t("features.leave.from")}</Label>
                <Input id="lv-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lv-end-time" className="mb-1.5 block">{t("features.leave.until")}</Label>
                <Input id="lv-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="lv-start" className="mb-1.5 block">{t("features.leave.firstDay")}</Label>
                <Input id="lv-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lv-end" className="mb-1.5 block">{t("features.leave.lastDay")}</Label>
                <Input id="lv-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          )}
          {partialDay && startTime && endTime && startTime >= endTime && (
            <p className="mt-2 text-xs text-destructive">{t("features.leave.endTimeError")}</p>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="mt-4" disabled={!canSubmit || request.isPending} onClick={() => request.mutate()}>
            {request.isPending ? t("features.leave.sending") : t("features.leave.sendRequest")}
          </Button>
        </CardContent>
      </Card>

      <SectionTitle>{t("features.leave.yourRequests")}</SectionTitle>
      <QueryBoundary query={history}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>{t("features.leave.empty")}</EmptyText>}
            {rows.map((leave) => (
              <Card key={leave.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{t(`features.leave.types.${leave.type}`, leave.type)}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {leave.start_date}
                      {leave.start_time && leave.end_time
                        ? ` · ${leave.start_time}–${leave.end_time}`
                        : ` → ${leave.end_date}`}
                    </p>
                  </div>
                  <Badge variant={leave.status === "approved" ? "success" : leave.status === "rejected" ? "destructive" : "warning"}>
                    {t(`features.leave.statuses.${leave.status}`)}
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