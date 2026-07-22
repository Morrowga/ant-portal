import { createBrowserRouter, Navigate } from "react-router-dom";

import { EmployeeRoute, ProtectedRoute } from "@/components/layout/EmployeeRoute";
import { PortalShell } from "@/components/layout/PortalShell";
import { LoginPage, NotForYouPage } from "@/features/auth/pages";
import { TodayPage } from "@/features/today/TodayPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { NewReportPage } from "@/features/reports/NewReportPage";
import { ReportDetailPage } from "@/features/reports/ReportDetailPage";
import { OvertimePage } from "@/features/overtime/OvertimePage";
import { OvertimeDetailPage } from "@/features/overtime/OvertimeDetailPage";
import { HealthPage } from "@/features/health/HealthPage";
import { KnowledgeListPage } from "@/features/knowledge/KnowledgeListPage";
import { KnowledgePostPage } from "@/features/knowledge/KnowledgePostPage";
import { KnowledgeNewPage } from "@/features/knowledge/KnowledgeNewPage";
import { LeavePage } from "@/features/leave/LeavePage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { InvoiceDetailPage } from "@/features/invoices/InvoiceDetailPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/not-for-you", element: <NotForYouPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <EmployeeRoute />,
        children: [
          {
            element: <PortalShell />,
            children: [
              { path: "/portal", element: <TodayPage /> },
              { path: "/portal/reports", element: <ReportsPage /> },
              { path: "/portal/reports/new", element: <NewReportPage /> },
              { path: "/portal/reports/:id", element: <ReportDetailPage /> },
              { path: "/portal/overtime", element: <OvertimePage /> },
              { path: "/portal/overtime/:id", element: <OvertimeDetailPage /> },
              { path: "/portal/health", element: <HealthPage /> },
              { path: "/portal/knowledge", element: <KnowledgeListPage /> },
              { path: "/portal/knowledge/new", element: <KnowledgeNewPage /> },
              { path: "/portal/knowledge/:id", element: <KnowledgePostPage /> },
              { path: "/portal/leave", element: <LeavePage /> },
              { path: "/portal/notifications", element: <NotificationsPage /> },
              { path: "/portal/invoices/:id", element: <InvoiceDetailPage /> },
              { path: "/portal/settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/portal" replace /> },
]);