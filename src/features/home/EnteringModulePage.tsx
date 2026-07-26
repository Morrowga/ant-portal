import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import logoUrl from "@/assets/logo.png";
import { MODULE_ENTRY_ROUTES, MODULE_LABELS, setActiveModule } from "@/lib/activeModule";

const DURATION_MS = 2500;

/**
 * Shown right after landing here (from Home's "Enter" click, or
 * EmployeeRoute's auto-redirect when there's exactly one active
 * module), before actually entering the module.
 *
 * THIS is the single place activeModule actually gets set -- in a
 * proper mount effect, guaranteed to run exactly once per genuine visit
 * to this route. EmployeeRoute itself never writes this during render
 * anymore (it used to, which caused a real race: an unrelated re-render
 * could see the just-written value before the browser had actually
 * navigated here, and skip straight past this screen). Setting it here
 * instead means it's only ever written when this component actually,
 * definitely mounts -- no ambiguity possible.
 */
export function EnteringModulePage() {
  const { t } = useTranslation();
  const { moduleKey = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setActiveModule(moduleKey);
  }, [moduleKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(MODULE_ENTRY_ROUTES[moduleKey] ?? "/launch", { replace: true });
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [moduleKey, navigate]);

  // Module display name is translatable too, with the hardcoded
  // MODULE_LABELS entry as the fallback if a translation isn't defined
  // for this module_key yet -- same pattern as HomePage's commented-out
  // label. Add "home.modules.<module_key>" to each locale file as each
  // module ships to fully translate this; until then it shows the
  // English fallback in every language, which is harmless.
  const label = t(`home.modules.${moduleKey}`, {
    defaultValue: MODULE_LABELS[moduleKey] ?? moduleKey,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-espresso p-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white">
        <img src={logoUrl} alt="" className="h-20 w-20 object-contain" />
      </div>
      <p className="text-lg font-medium text-cream">
        {t("features.entering.connectingWith", { module: label })}
      </p>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white"
          style={{ animation: `entering-module-progress ${DURATION_MS}ms linear forwards` }}
        />
      </div>
      <style>{`
        @keyframes entering-module-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}