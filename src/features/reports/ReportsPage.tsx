import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/lib/api-client";
import { fmtDay } from "@/lib/format";
import type { Overtime, Report } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyText } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

export const isEditable = (report: Report) => new Date(report.editable_until).getTime() > Date.now();

export function ReportsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-xl font-semibold">{t("features.reports.pageTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("features.reports.pageDescription")}
      </p>
      <Tabs defaultValue="daily" className="mt-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="daily">{t("features.reports.tabs.daily")}</TabsTrigger>
          <TabsTrigger value="overtime">{t("features.reports.tabs.overtime")}</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><DailyList /></TabsContent>
        <TabsContent value="overtime"><OvertimeList /></TabsContent>
      </Tabs>
    </div>
  );
}

function DailyList() {
  const { t } = useTranslation();
  const reports = useQuery({
    queryKey: ["reports", "me"],
    queryFn: async () => (await api.get<Report[]>("/reports/me")).data,
  });
  return (
    <QueryBoundary query={reports}>
      {(rows) => (
        <div className="space-y-2">
          {rows.length === 0 && <EmptyText>{t("features.reports.daily.empty")}</EmptyText>}
          {rows.map((report) => (
            <Link key={report.id} to={`/portal/reports/${report.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold">
                      {fmtDay(report.report_date)} · <span className="tabular">{report.hours}h</span>
                    </p>
                    {isEditable(report)
                      ? <Badge className="bg-copper/10 text-copper border-transparent">{t("features.reports.daily.editableToday")}</Badge>
                      : <Badge variant="secondary">{t("features.reports.daily.locked")}</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{report.summary}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}

function OvertimeList() {
  const { t } = useTranslation();
  const overtime = useQuery({
    queryKey: ["overtime", "me", "all"],
    queryFn: async () => (await api.get<Overtime[]>("/overtime/me")).data,
  });
  return (
    <QueryBoundary query={overtime}>
      {(rows) => (
        <div className="space-y-2">
          {rows.length === 0 && <EmptyText>{t("features.reports.overtime.empty")}</EmptyText>}
          {rows.map((ot) => (
            <Link key={ot.id} to={`/portal/overtime/${ot.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold">
                      {fmtDay(ot.start_at)}{ot.hours !== null ? <span className="tabular"> · {ot.hours}h</span> : ""}
                    </p>
                    {ot.end_at ? <Badge variant="secondary">{t("features.reports.overtime.closed")}</Badge> : <Badge variant="warning">{t("features.reports.overtime.inProgress")}</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                    {ot.summary ?? ot.reason ?? t("features.reports.overtime.noSummaryYet")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}