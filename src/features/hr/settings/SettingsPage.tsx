/**
 * Settings — Certificates, Kudos, Attendance history, Invoices, Feedback &
 * complaints, and Language. Nothing else from the mobile Profile menu (no
 * desk location, no notification preferences, no change password). Tab is
 * deep-linkable via ?tab= for the Today quick links.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { API_BASE_URL, api, errorDetail } from "@/lib/api-client";
import { clearActiveModule } from "@/lib/activeModule";
import { fmtClock, fmtDay, fmtDayLong } from "@/lib/format";
import type { AttendanceSession, Certificate, FeedbackTicket, Me, PayrollInvoice, Recognition } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Chip, EmptyText, ErrorText, SectionTitle } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

const TABS = ["certificates", "kudos", "attendance", "invoices", "feedback", "language"] as const;
type Tab = (typeof TABS)[number];

const ASSIGNED_LANGUAGE_KEY = "ants.portal.assigned_language";

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "") ? (requested as Tab) : "certificates";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">{t("settings.pageTitle")}</h1>

      {/* New: Exit -- distinct from Sign out (which lives elsewhere, e.g.
          PortalShell's nav). Exit leaves this module WITHOUT ending the
          session, and returns to Home so the person can pick a different
          active module. Always shown, even with only one module active
          today -- Home still works correctly in that case (it just shows
          the one card to re-enter). */}
      <Card className="mt-4">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="pr-3">
            <p className="text-sm font-medium">Exit this module</p>
            <p className="text-xs text-muted-foreground">
              Go back and choose a different module. You'll stay signed in.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              clearActiveModule();
              navigate("/home", { replace: true });
            }}
          >
            Exit
          </Button>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })} className="mt-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid sm:grid-cols-6">
          <TabsTrigger value="certificates">{t("settings.tabs.certificates")}</TabsTrigger>
          <TabsTrigger value="kudos">{t("settings.tabs.kudos")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("settings.tabs.attendance")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("settings.tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="feedback">{t("settings.tabs.feedback")}</TabsTrigger>
          <TabsTrigger value="language">{t("settings.tabs.language")}</TabsTrigger>
        </TabsList>
        <TabsContent value="certificates"><CertificatesTab /></TabsContent>
        <TabsContent value="kudos"><KudosTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab /></TabsContent>
        <TabsContent value="language"><LanguageTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CertificatesTab() {
  const { t } = useTranslation();
  const certificates = useQuery({
    queryKey: ["certificates", "me"],
    queryFn: async () => (await api.get<Certificate[]>("/certificates/me")).data,
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {t("settings.certificates.description")}
      </p>
      <QueryBoundary query={certificates}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>{t("settings.certificates.empty")}</EmptyText>}
            {rows.map((certificate) => (
              <Card key={certificate.id}>
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {t(`settings.certificates.${certificate.period_type}Certificate`)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular">
                      {certificate.period_start} → {certificate.period_end}
                    </p>
                  </div>
                  {certificate.pdf_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={`${API_BASE_URL}/certificates/${certificate.id}/download`} target="_blank" rel="noreferrer">
                        {t("settings.certificates.downloadPdf")}
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">{t("settings.certificates.generating")}</Badge>
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
  const { t } = useTranslation();
  const kudos = useQuery({
    queryKey: ["recognitions", "me"],
    queryFn: async () => (await api.get<Recognition[]>("/recognitions/me")).data,
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {t("settings.kudos.description")}
      </p>
      <QueryBoundary query={kudos}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>{t("settings.kudos.empty")}</EmptyText>}
            {rows.map((recognition) => (
              <Card key={recognition.id}>
                <CardContent className="px-4 py-3">
                  <p className="text-sm leading-5">🏆 {recognition.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(recognition.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
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
  const { t } = useTranslation();
  const history = useQuery({
    queryKey: ["attendance", "history"],
    queryFn: async () => (await api.get<AttendanceSession[]>("/attendance/me/history")).data,
  });
  return (
    <QueryBoundary query={history}>
      {(rows) => (
        <div className="space-y-2">
          {rows.length === 0 && <EmptyText>{t("settings.attendance.empty")}</EmptyText>}
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
                  {hours ? <Badge variant="secondary" className="tabular">{hours}h</Badge> : <Badge variant="success">{t("settings.attendance.open")}</Badge>}
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
  const { t } = useTranslation();
  const currency = useCompanyCurrency();
  const invoices = useQuery({
    queryKey: ["invoices", "me"],
    queryFn: async () => (await api.get<PayrollInvoice[]>("/invoices/me")).data,
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {t("settings.invoices.description")}
      </p>
      <QueryBoundary query={invoices}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>{t("settings.invoices.empty")}</EmptyText>}
            {[...rows].sort((a, b) => b.period_start.localeCompare(a.period_start)).map((invoice) => (
              <Link key={invoice.id} to={`/ants-office/invoices/${invoice.id}`}>
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
                    <Badge variant="secondary">
                      {invoice.actual_working_hours ? t("settings.invoices.actual") : t("settings.invoices.scheduled")}
                    </Badge>
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

// NOTE: category values stay untranslated here in the picker keys
// themselves (used as API values); only the CHIP LABEL shown to the user
// is translated, via feedback.categories.* -- same pattern as other
// backend-driven category slugs elsewhere in the codebase.
const FEEDBACK_CATEGORIES = ["workload", "workplace", "management", "harassment", "other"];

function FeedbackTab() {
  const { t } = useTranslation();
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
              <Chip key={c} label={t(`settings.feedback.categories.${c}`)} selected={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
          {category === "harassment" && (
            <p className="mb-2 text-xs text-muted-foreground">
              {t("settings.feedback.harassmentNote")}
            </p>
          )}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("settings.feedback.messagePlaceholder")}
            rows={4}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="pr-3">
              <Label className="text-sm">{t("settings.feedback.submitAnonymously")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.feedback.anonymousNote")}</p>
            </div>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button className="mt-3" disabled={message.trim().length < 5 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? t("settings.feedback.sending") : t("settings.feedback.send")}
          </Button>
        </CardContent>
      </Card>

      <SectionTitle>{t("settings.feedback.yourTickets")}</SectionTitle>
      <QueryBoundary query={mine}>
        {(rows) => (
          <div className="space-y-2">
            {rows.length === 0 && <EmptyText>{t("settings.feedback.noneRaised")}</EmptyText>}
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
                  {ticket.anonymous && <p className="mt-1 text-[11px] text-copper">{t("settings.feedback.submittedAnonymously")}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

/** New: the ONLY language control an employee has. There is no 5-language
 * picker here, deliberately -- their assigned display language is decided
 * by their company (an Owner/Manager, via the dashboard). This is a
 * binary toggle: switch the portal to English, or switch back to
 * whatever the company assigned.
 *
 * Since User.language is a single field with no separate "originally
 * assigned" column, the first time we see a non-English value we cache it
 * in localStorage so the "switch back" direction has something to return
 * to, even after the employee has toggled to English. */
function LanguageTab() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<Me>("/me")).data,
  });

  useEffect(() => {
    if (me.data?.language && me.data.language !== "en" && !localStorage.getItem(ASSIGNED_LANGUAGE_KEY)) {
      localStorage.setItem(ASSIGNED_LANGUAGE_KEY, me.data.language);
    }
  }, [me.data?.language]);

  const setLanguage = useMutation({
    mutationFn: (language: string) => api.patch("/me", { language }),
    onSuccess: (_res, language) => {
      i18n.changeLanguage(language);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const isEnglish = me.data?.language === "en";
  const assignedLanguage = localStorage.getItem(ASSIGNED_LANGUAGE_KEY);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-sm font-medium">{t("settings.language.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("settings.language.description")}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="pr-3">
            <Label className="text-sm">{t("settings.language.useEnglish")}</Label>
            <p className="text-xs text-muted-foreground">
              {assignedLanguage
                ? t("settings.language.toggleOffHint", { language: t(`settings.language.names.${assignedLanguage}`) })
                : t("settings.language.toggleOffHintNoAssigned")}
            </p>
          </div>
          <Switch
            checked={isEnglish}
            disabled={setLanguage.isPending}
            onCheckedChange={(checked) => {
              if (checked) {
                setLanguage.mutate("en");
              } else {
                setLanguage.mutate(assignedLanguage ?? "en");
              }
            }}
          />
        </div>
        {setLanguage.isError && <ErrorText>{errorDetail(setLanguage.error)}</ErrorText>}
      </CardContent>
    </Card>
  );
}