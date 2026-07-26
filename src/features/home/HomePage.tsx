import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { MODULE_IMAGES, MODULE_LABELS } from "@/lib/activeModule";
import { useMyModules } from "@/lib/useMyModules";

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const modules = useMyModules();
  const { me, logout } = useAuth();

  // Doesn't call setActiveModule() here anymore -- EnteringModulePage's
  // own mount effect is now the SINGLE place that happens, no matter how
  // you arrive there (this click, or EmployeeRoute's auto-redirect for
  // the single-module case). Avoids two different call sites racing to
  // write the same state.
  const onEnter = (moduleKey: string) => {
    navigate(`/entering/${moduleKey}`, { replace: true });
  };

  return (
    <div className="space-y-4 py-8 px-10">
      {/* Name on the left, Sign out on the right, same row. */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{me?.full_name ?? me?.email}</p>
        <Button variant="outline" size="sm" onClick={logout}>
          {t("common.signOut")}
        </Button>
      </div>
      <div>
        <h1 className="text-xl font-semibold">{t("home.availableApps")}</h1>
      </div>
      {/* flex + small fixed gap, NOT a multi-column grid -- a grid splits
          the full row width into wide equal columns, so with only a
          couple of tiles they end up far apart. flex-wrap just packs
          each fixed-width tile snugly against the next one and wraps
          naturally once there are enough to need it. */}
      <div className="flex flex-wrap gap-4">
        {(modules.data ?? []).map((m) => (
          <button
            key={m.module_key}
            type="button"
            onClick={() => onEnter(m.module_key)}
            className="flex w-36 flex-col items-center gap-3 text-center transition-opacity hover:opacity-80"
          >
            {MODULE_IMAGES[m.module_key] ? (
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-espresso bg-transparent">
                <img
                  src={MODULE_IMAGES[m.module_key]}
                  alt=""
                  className="h-32 w-32 object-contain"
                />
              </div>
            ) : (
              // TODO: placeholder until a real image exists for this
              // module_key in MODULE_IMAGES (@/lib/activeModule.ts).
              <div className="h-28 w-28 rounded-2xl bg-muted" />
            )}
            {/* Label intentionally hidden per current design (icon-only
                tiles) -- kept here, translated, in case it comes back. */}
            {/* <p className="text-sm font-semibold leading-snug">
              {t(`home.modules.${m.module_key}`, { defaultValue: MODULE_LABELS[m.module_key] ?? m.module_key })}
            </p> */}
          </button>
        ))}
      </div>
    </div>
  );
}