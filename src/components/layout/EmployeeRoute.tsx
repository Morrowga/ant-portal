import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";

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
  if (!claims) return <Navigate to="/login" replace />;
  if (claims.role !== "employee") return <Navigate to="/not-for-you" replace />;

  // me hasn't resolved yet (claims decoded but /me still in flight) --
  // render nothing rather than redirecting based on stale/default state.
  if (!me) return null;

  const onOnboardingPath = ONBOARDING_PATHS.some((path) => location.pathname.startsWith(path));

  // New: gate on the server's own onboarding_completed_at, same as
  // mobile's index.tsx redirect logic -- not a local flag, since the
  // portal has no per-device storage concept to (mis)use anyway.
  if (!onboarded && !onOnboardingPath) {
    return <Navigate to="/onboarding/consent" replace />;
  }
  // Already onboarded but trying to revisit the onboarding pages --
  // send them back into the app instead of showing a stale flow.
  if (onboarded && onOnboardingPath) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}