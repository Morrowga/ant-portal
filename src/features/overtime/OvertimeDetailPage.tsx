/** Read-only look-back at a single overtime session — start/end lives on the
 *  Overtime flow, not here. */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api } from "@/lib/api-client";
import type { Overtime } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

const fmtDateTime = (value: string) =>
  new Date(value).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function OvertimeDetailPage() {
  const { id } = useParams();
  const overtime = useQuery({
    queryKey: ["overtime", id],
    queryFn: async () => (await api.get<Overtime>(`/overtime/${id}`)).data,
  });

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
        <Link to="/portal/overtime"><ArrowLeft className="h-4 w-4" /> Overtime</Link>
      </Button>
      <QueryBoundary query={overtime}>
        {(ot) => (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold">{fmtDateTime(ot.start_at)}</p>
                  {ot.end_at ? <Badge variant="secondary">closed</Badge> : <Badge variant="warning">in progress</Badge>}
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {ot.end_at ? `Ended ${fmtDateTime(ot.end_at)}` : "Still running"}
                  {ot.hours !== null ? ` · ${ot.hours}h` : ""}
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">Initiated by {ot.initiated_by}</p>
              </CardContent>
            </Card>
            {ot.reason && (
              <Card>
                <CardContent className="p-5">
                  <p className="mb-1 text-sm font-semibold">Reason</p>
                  <p className="text-sm leading-6">{ot.reason}</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-5">
                <p className="mb-1 text-sm font-semibold">Closing summary</p>
                {ot.summary ? (
                  <p className="text-sm leading-6">{ot.summary}</p>
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    {ot.end_at
                      ? "No summary was recorded."
                      : "Not closed yet — a summary is required before this session can end."}
                  </p>
                )}
              </CardContent>
            </Card>
            {ot.ai_summary && (
              <Card>
                <CardContent className="p-5">
                  <p className="mb-1 text-sm font-semibold">AI summary</p>
                  <p className="text-[13px] leading-5 text-muted-foreground">{ot.ai_summary}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
