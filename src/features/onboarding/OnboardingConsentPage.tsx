/**
 * Portal onboarding consent -- health + notifications only. NO location
 * card at all: the portal never does GPS/location tracking (that's
 * mobile-only, per existing scope), so there's nothing to consent to
 * there and no reason to show a card that doesn't apply.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api, errorDetail } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/** titleKey/bodyKey resolve under features.onboardingConsent.items.* */
const CONSENTS = [
  { type: "health" as const, titleKey: "healthTitle", bodyKey: "healthBody" },
  { type: "notifications" as const, titleKey: "notificationsTitle", bodyKey: "notificationsBody" },
];

export function OnboardingConsentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useAuth(); // ensures this only renders inside the authenticated tree; no fields needed directly here
  const [accepted, setAccepted] = useState<Record<string, boolean>>({ health: true, notifications: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      for (const consent of CONSENTS) {
        await api.post("/consent", { type: consent.type, accepted: !!accepted[consent.type] });
      }
      navigate("/onboarding/checklist");
    } catch (e) {
      setError(errorDetail(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-xl font-semibold">{t("features.onboardingConsent.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("features.onboardingConsent.subtitle")}</p>

      <div className="mt-6 space-y-4">
        {CONSENTS.map((consent) => (
          <Card key={consent.type}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="pr-3 text-sm font-semibold">{t(`features.onboardingConsent.items.${consent.titleKey}`)}</p>
                <Switch
                  checked={!!accepted[consent.type]}
                  onCheckedChange={(value) => setAccepted((prev) => ({ ...prev, [consent.type]: value }))}
                />
              </div>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                {t(`features.onboardingConsent.items.${consent.bodyKey}`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <Button className="mt-6 w-full" disabled={busy} onClick={submit}>
        {busy ? t("features.onboardingConsent.saving") : t("features.onboardingConsent.saveChoices")}
      </Button>
    </div>
  );
}