/**
 * Settings — Certificates, Kudos, Attendance history, Invoices, Feedback &
 * complaints. Nothing else from the mobile Profile menu (no desk location,
 * no notification preferences, no change password). Tab is deep-linkable
 * via ?tab= for the Today quick links.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { API_BASE_URL, api, errorDetail } from "@/lib/api-client";
import { fmtClock, fmtDay, fmtDayLong } from "@/lib/format";
import type { AttendanceSession, Certificate, FeedbackTicket, PayrollInvoice, Recognition } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Chip, EmptyText, ErrorText, SectionTitle } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

const TABS = ["certificates", "kudos", "attendance", "invoices", "feedback"] as const;
type Tab = (typeof TABS)[number];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "") ? (requested as Tab) : "certificates";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })} className="mt-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid sm:grid-cols-5">
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="kudos">Kudos</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="certificates"><CertificatesTab /></TabsContent>
        <TabsContent value="kudos"><KudosTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CertificatesTab() {
  const certificates = useQuery({
    queryKey: ["certificates", "me"],
    queryFn: async () => (await api.get<Certificate[]>("/certificates/me")).data,
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Issued automatically at the end of every month and year — a portable record of your work. No approval needed.
      </p>
      <QueryBoundary query={certificates}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>Your first certificate arrives at the end of this month.</EmptyText>}
            {rows.map((certificate) => (
              <Card key={certificate.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{certificate.period_type} certificate</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {certificate.period_start} → {certificate.period_end}
                    </p>
                  </div>
                  {certificate.pdf_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={`${API_BASE_URL}/certificates/${certificate.id}/download`} target="_blank" rel="noreferrer">
                        Download PDF
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">generating</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

function KudosTab() {
  const kudos = useQuery({
    queryKey: ["recognitions", "me"],
    queryFn: async () => (await api.get<Recognition[]>("/recognitions/me")).data,
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Kudos your managers have given you. These also feed your impact score.
      </p>
      <QueryBoundary query={kudos}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>No kudos yet — they'll show up here when they land.</EmptyText>}
            {rows.map((recognition) => (
              <Card key={recognition.id}>
                <CardContent className="px-4 py-3">
                  <p className="text-sm leading-5">🏆 {recognition.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(recognition.created_at).toLocaleDateString("en", { month: "long", day: "numeric" })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

function AttendanceTab() {
  const history = useQuery({
    queryKey: ["attendance", "history"],
    queryFn: async () => (await api.get<AttendanceSession[]>("/attendance/me/history")).data,
  });
  return (
    <QueryBoundary query={history}>
      {(rows) => (
        <div className="space-y-2">
          {rows.length === 0 && <EmptyText>No attendance sessions yet.</EmptyText>}
          {rows.map((session) => {
            const checkOut = session.check_out_at ? new Date(session.check_out_at) : null;
            const hours = checkOut
              ? ((checkOut.getTime() - new Date(session.check_in_at).getTime()) / 3_600_000).toFixed(1)
              : null;
            return (
              <Card key={session.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{fmtDayLong(session.check_in_at)}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {fmtClock(session.check_in_at)} → {session.check_out_at ? fmtClock(session.check_out_at) : "…"}
                    </p>
                  </div>
                  {hours ? <Badge variant="secondary" className="tabular">{hours}h</Badge> : <Badge variant="success">open</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </QueryBoundary>
  );
}

function useCompanyCurrency(): string {
  const query = useQuery({
    queryKey: ["company", "me"],
    queryFn: async () => (await api.get<{ currency: string }>("/company/me")).data,
  });
  return query.data?.currency ?? "USD";
}

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function InvoicesTab() {
  const currency = useCompanyCurrency();
  const invoices = useQuery({
    queryKey: ["invoices", "me"],
    queryFn: async () => (await api.get<PayrollInvoice[]>("/invoices/me")).data,
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Generated by your company, one per pay period. Tap one for the full breakdown and to download it.
      </p>
      <QueryBoundary query={invoices}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>No invoices yet — these appear once your company generates one for a pay period.</EmptyText>}
            {[...rows].sort((a, b) => b.period_start.localeCompare(a.period_start)).map((invoice) => (
              <Link key={invoice.id} to={`/portal/invoices/${invoice.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {fmtDay(invoice.period_start)} – {fmtDay(invoice.period_end)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {invoice.total_hours.toFixed(2)}h · {fmtMoney(invoice.total_amount, currency)}
                      </p>
                    </div>
                    <Badge variant="secondary">{invoice.actual_working_hours ? "actual" : "scheduled"}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

const FEEDBACK_CATEGORIES = ["workload", "workplace", "management", "harassment", "other"];

function FeedbackTab() {
  const qc = useQueryClient();
  const mine = useQuery({
    queryKey: ["feedback", "me"],
    queryFn: async () => (await api.get<FeedbackTicket[]>("/feedback/me")).data,
  });
  const [category, setCategory] = useState("workload");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => api.post("/feedback", { category, message: message.trim(), anonymous }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feedback"] }); setMessage(""); },
    onError: (e) => setError(errorDetail(e)),
  });

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
          {category === "harassment" && (
            <p className="mb-2 text-xs text-muted-foreground">
              Harassment reports go directly to the company Owner only — managers never see them.
            </p>
          )}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's going on? Be as specific as you're comfortable with."
            rows={4}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="pr-3">
              <Label className="text-sm">Submit anonymously</Label>
              <p className="text-xs text-muted-foreground">Your name is never attached — not even for the Owner.</p>
            </div>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="mt-3" disabled={message.trim().length < 5 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </CardContent>
      </Card>

      <SectionTitle>Your tickets</SectionTitle>
      <QueryBoundary query={mine}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>Nothing raised yet.</EmptyText>}
            {rows.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{ticket.category}</Badge>
                    <Badge variant={ticket.status === "resolved" ? "success" : ticket.status === "new" ? "warning" : "secondary"}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{ticket.message}</p>
                  {ticket.anonymous && <p className="mt-1 text-[11px] text-copper">submitted anonymously</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}