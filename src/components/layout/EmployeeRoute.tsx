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
  if (!activeModule) {
    // BUG FIX: this used to only handle the single-module case --
    // `activeKeys.length === 1` -- and treated anything else (2+
    // modules) as automatically invalid, bouncing straight back to
    // /home. That's wrong: when a company has 2+ modules, HomePage's own
    // picker deliberately navigates here (to /entering/{key} for
    // whichever tile was clicked) BEFORE EnteringModulePage has had a
    // chance to mount and actually set activeModule -- so at the exact
    // instant this guard runs, activeModule is still null even though
    // the navigation itself is entirely legitimate. The old code's
    // `else` branch caught this in-flight, valid navigation and
    // immediately redirected back to /home, which is exactly the
    // Home -> flash -> Home loop reported after Exit: any click on a
    // tile, with 2+ modules active, could never actually complete.
    //
    // This was never hit before because every test account only ever
    // had ONE active module at a time -- it only surfaced once a
    // company (Northwind) genuinely had two modules enabled together.
    //
    // Fix: recognize "the current path IS already /entering/{key} for a
    // real, currently-active module key" as a valid, complete state on
    // its own, regardless of how many total modules exist. Only fall
    // through to the single-module auto-redirect / home-redirect
    // behavior when the current path ISN'T already a legitimate
    // in-flight entry.
    const enteringMatch = /^\/entering\/([^/]+)$/.exec(location.pathname);
    const enteringKeyFromPath = enteringMatch?.[1];
    const alreadyEnteringValidModule = !!enteringKeyFromPath && activeKeys.includes(enteringKeyFromPath);

    if (alreadyEnteringValidModule) {
      // Let it render -- EnteringModulePage's own mount effect is what
      // actually sets activeModule, not this guard.
    } else if (activeKeys.length === 1) {
      const onlyKey = activeKeys[0];
      if (location.pathname !== `/entering/${onlyKey}`) {
        return <Navigate to={`/entering/${onlyKey}`} replace />;
      }
      // else: exactly on /entering/{onlyKey} already -- let it render.
    } else {
      // 2+ modules, activeModule not set, and NOT already correctly
      // heading into one of them via /entering/{key} -- e.g. someone
      // bookmarked /ants-office directly with nothing active yet. No
      // way to know which module they mean, so send them to the picker.
      return <Navigate to="/home" replace />;
    }
  }

  return <Outlet />;
}