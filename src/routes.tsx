import { createBrowserRouter, Navigate } from "react-router-dom";

import { EmployeeRoute, ProtectedRoute } from "@/components/layout/EmployeeRoute";
import { AcceptInvitePage, LoginPage, NotForYouPage } from "@/features/auth/pages";
import { HomePage } from "@/features/home/HomePage";
import { LaunchPage } from "@/features/home/LaunchPage";
import { EnteringModulePage } from "@/features/home/EnteringModulePage";
import { NoModulesPage } from "@/features/home/NoModulesPage";
import { OnboardingConsentPage } from "@/features/onboarding/OnboardingConsentPage";
import { OnboardingChecklistPage } from "@/features/onboarding/OnboardingChecklistPage";
import { hrRoutes } from "@/features/hr/hrRoutes";
import { warehouseRoutes } from "@/features/warehouse/warehouseRoutes";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  { path: "/not-for-you", element: <NotForYouPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <EmployeeRoute />,
        children: [
          { path: "/onboarding/consent", element: <OnboardingConsentPage /> },
          { path: "/onboarding/checklist", element: <OnboardingChecklistPage /> },
          // Module picker (2+ active modules, nothing chosen yet), the
          // neutral post-login landing spot, the connecting-screen
          // transition, and the zero-modules empty state -- all
          // module-agnostic, core/platform-level, NOT part of any
          // specific module's UI. A second module (Warehouse, POS)
          // would reuse all four of these unchanged.
          { path: "/launch", element: <LaunchPage /> },
          { path: "/home", element: <HomePage /> },
          { path: "/entering/:moduleKey", element: <EnteringModulePage /> },
          { path: "/no-modules", element: <NoModulesPage /> },
          // HR module's own routes -- see src/features/hr/hrRoutes.tsx.
          ...hrRoutes,
          // Warehouse module's own routes -- see
          // src/features/warehouse/warehouseRoutes.tsx.
          ...warehouseRoutes,
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/launch" replace /> },
]);