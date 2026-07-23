/** Report detail: AI pace label + reasoning (null-graceful on Startup tier),
 *  manager comments, and same-day edit/delete disabled after editable_until. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, errorDetail } from "@/lib/api-client";
import { fmtDayLong, fmtStamp } from "@/lib/format";
import type { ReportDetail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

export function ReportDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const report = useQuery({
    queryKey: ["reports", id],
    queryFn: async () => (await api.get<ReportDetail>(`/reports/${id}`)).data,
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: () => api.delete(`/reports/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); navigate("/portal/reports"); },
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
        <Link to="/portal/reports"><ArrowLeft className="h-4 w-4" /> {t("features.reportDetail.reports")}</Link>
      </Button>
      <QueryBoundary query={report}>
        {(data) => {
          const editable = new Date(data.editable_until).getTime() > Date.now();
          return (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-semibold">{fmtDayLong(data.report_date)}</p>
                    <Badge className="border-transparent bg-copper/10 text-copper tabular">{data.hours}h</Badge>
                  </div>
                  {data.project_name && <p className="mt-1 text-[13px] text-muted-foreground">{data.project_name}</p>}
                  {editing ? (
                    <EditForm
                      data={data}
                      onDone={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["reports"] }); }}
                    />
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{data.summary}</p>
                  )}
                  {!editing && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" className="flex-1" disabled={!editable} onClick={() => setEditing(true)}>
                        {t("features.reportDetail.edit")}
                      </Button>
                      <Button
                        variant="destructive" className="flex-1" disabled={!editable || remove.isPending}
                        onClick={() => remove.mutate()}
                      >
                        {t("features.reportDetail.delete")}
                      </Button>
                    </div>
                  )}
                  {!editable && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("features.reportDetail.lockedNote")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {data.ai_analysis ? (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{t("features.reportDetail.workdayPace")}</p>
                      <Badge
                        variant={
                          data.ai_analysis.pace_label === "heavy" ? "warning"
                          : data.ai_analysis.pace_label === "steady" ? "success" : "secondary"
                        }
                      >
                        {data.ai_analysis.pace_label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{data.ai_analysis.reasoning}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-[13px] text-muted-foreground">
                      {t("features.reportDetail.paceUnavailable")}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-5">
                  <p className="mb-2 text-sm font-semibold">{t("features.reportDetail.managerComments")}</p>
                  {data.comments.length === 0 && <p className="text-[13px] text-muted-foreground">{t("features.reportDetail.noComments")}</p>}
                  {data.comments.map((comment) => (
                    <div key={comment.id} className="mb-2 rounded-lg bg-muted/60 p-3">
                      <p className="text-[13px]">{comment.comment}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground tabular">{fmtStamp(comment.created_at)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {error && <ErrorText>{error}</ErrorText>}
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

function EditForm({ data, onDone }: { data: ReportDetail; onDone: () => void }) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(String(data.hours));
  const [summary, setSummary] = useState(data.summary);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api.patch(`/reports/${data.id}`, { hours: Number(hours), summary }),
    onSuccess: onDone,
    onError: (e) => setError(errorDetail(e)),
  });
  return (
    <div className="mt-3 space-y-2">
      <Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} aria-label={t("features.reportDetail.hoursAriaLabel")} className="max-w-32" />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
      {error && <ErrorText>{error}</ErrorText>}
      <Button disabled={save.isPending} onClick={() => save.mutate()}>{t("features.reportDetail.saveChanges")}</Button>
    </div>
  );
}