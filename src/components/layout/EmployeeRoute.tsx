import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { clearActiveModule, getActiveModule, MODULE_ENTRY_ROUTES } from "@/lib/activeModule";
import { useMyModules } from "@/lib/useMyModules";

/** This portal is for role === "employee" ONLY (mirrors the dashboard's
 *  OwnerRoute pattern). Managers and owners use the company dashboard. */
export function ProtectedRoute() {
  const { claims } = useAuth();
  const location = useLocation();
  if (!claims) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

const ONBOARDING_PATHS = ["/onboarding/consent", "/onboarding/checklist"];

export function EmployeeRoute() {
  const { claims, me, onboarded } = useAuth();
  const location = useLocation();
  const modules = useMyModules();

  if (!claims) return <Navigate to="/login" replace />;
  if (claims.role !== "employee") return <Navigate to="/not-for-you" replace />;

  // me hasn't resolved yet (claims decoded but /me still in flight) --
  // render nothing rather than redirecting based on stale/default state.
  if (!me) return null;

  const onOnboardingPath = ONBOARDING_PATHS.some((path) => location.pathname.startsWith(path));

  if (!onboarded && !onOnboardingPath) {
    return <Navigate to="/onboarding/consent" replace />;
  }
  if (onboarded && onOnboardingPath) {
    return <Navigate to="/launch" replace />;
  }
  if (onOnboardingPath) return <Outlet />; // still mid-onboarding, module gating below doesn't apply yet

  // ---- module gating ----
  if (modules.isLoading) return null;

  const activeKeys = (modules.data ?? []).map((m) => m.module_key);
  let activeModule = getActiveModule();

  // Stale entry -- the module they'd entered got disabled since. Treat
  // as if nothing were entered and re-decide below, rather than
  // redirecting them into a module route that will itself now 409/403.
  if (activeModule && !activeKeys.includes(activeModule)) {
    clearActiveModule();
    activeModule = null;
  }

  const onHome = location.pathname === "/home";
  const onNoModules = location.pathname === "/no-modules";
  const onLaunch = location.pathname === "/launch";

  // Nothing active at all -- takes priority over everything else;
  // there's nothing to pick between and nowhere to enter.
  if (activeKeys.length === 0) {
    if (!onNoModules) return <Navigate to="/no-modules" replace />;
    return <Outlet />;
  }
  if (onNoModules) {
    return <Navigate to="/home" replace />;
  }

  // /launch is NEVER a real destination -- this is a SINGLE, complete,
  // side-effect-free decision (no setActiveModule() call here). Whether
  // activeModule was already set (a stale/existing session) or nothing
  // is set yet, this always computes exactly one Navigate target and
  // returns immediately. Crucially: it does NOT write to localStorage
  // during render. That write used to happen here, which caused a real
  // race -- an unrelated re-render (e.g. a React Query cache update)
  // could re-evaluate this component for the same still-current /launch
  // path AFTER the write but BEFORE the browser actually navigated away,
  // see activeModule already set, and jump straight to the module,
  // skipping /entering/{key} entirely. Setting activeModule now happens
  // ONLY in EnteringModulePage's own mount effect -- guaranteed to run
  // exactly once per genuine visit to that route, never during a
  // parent's render pass.
  if (onLaunch) {
    if (activeModule) {
      return <Navigate to={MODULE_ENTRY_ROUTES[activeModule] ?? "/home"} replace />;
    }
    if (activeKeys.length === 1) {
      return <Navigate to={`/entering/${activeKeys[0]}`} replace />;
    }
    return <Navigate to="/home" replace />;
  }

  if (onHome) {
    // Home is a picker screen -- only reachable when nothing has been
    // "entered" yet. Once a module is active, Home redirects straight
    // back into it; the only way back here is Exit (in Settings),
    // which clears activeModule before navigating to /home.
    if (activeModule) return <Navigate to={MODULE_ENTRY_ROUTES[activeModule] ?? "/launch"} replace />;
    return <Outlet />;
  }

  // General case (any module route, e.g. /entering/:key or /ants-office
  // reached directly via bookmark/back-button): also side-effect-free.
  // If nothing's active yet and there's exactly one module, redirect
  // through /entering/{key} -- EnteringModulePage sets activeModule
  // itself once it actually mounts, not here.
  if (!activeModule) {
    if (activeKeys.length === 1) {
      const onlyKey = activeKeys[0];
      if (location.pathname !== `/entering/${onlyKey}`) {
        return <Navigate to={`/entering/${onlyKey}`} replace />;
      }
      // else: exactly on /entering/{onlyKey} already -- let it render;
      // ITS OWN mount effect is what sets activeModule, not us.
    } else {
      return <Navigate to="/home" replace />;
    }
  }

  return <Outlet />;
}