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

export function EmployeeRoute() {
  const { claims } = useAuth();
  if (!claims) return <Navigate to="/login" replace />;
  if (claims.role !== "employee") return <Navigate to="/not-for-you" replace />;
  return <Outlet />;
}
