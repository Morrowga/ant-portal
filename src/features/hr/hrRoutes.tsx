import type { RouteObject } from "react-router-dom";

import { OfficeShell } from "@/components/layout/OfficeShell";
import { TodayPage } from "@/features/hr/today/TodayPage";
import { ReportsPage } from "@/features/hr/reports/ReportsPage";
import { NewReportPage } from "@/features/hr/reports/NewReportPage";
import { ReportDetailPage } from "@/features/hr/reports/ReportDetailPage";
import { OvertimePage } from "@/features/hr/overtime/OvertimePage";
import { OvertimeDetailPage } from "@/features/hr/overtime/OvertimeDetailPage";
import { HealthPage } from "@/features/hr/health/HealthPage";
import { KnowledgeListPage } from "@/features/hr/knowledge/KnowledgeListPage";
import { KnowledgePostPage } from "@/features/hr/knowledge/KnowledgePostPage";
import { KnowledgeNewPage } from "@/features/hr/knowledge/KnowledgeNewPage";
import { LeavePage } from "@/features/hr/leave/LeavePage";
import { NotificationsPage } from "@/features/hr/notifications/NotificationsPage";
import { InvoiceDetailPage } from "@/features/hr/invoices/InvoiceDetailPage";
import { SettingsPage } from "@/features/hr/settings/SettingsPage";

/**
 * The HR module's own routes -- everything under /ants-office/*. Split
 * into its own file so this module's routes are self-contained, the
 * same way a second module (Warehouse, POS) gets its own equivalent
 * file rather than everything piling into one giant routes.tsx.
 *
 * As of this pass, the PAGE FOLDERS themselves are also nested under
 * features/hr/ (not just this routes file) -- e.g. features/today/ is
 * now features/hr/today/. If you're adding a new HR screen, put it
 * under features/hr/<name>/, not directly under features/.
 *
 * This array gets spread into the main router's EmployeeRoute children
 * in src/routes.tsx -- it does NOT export its own router; PortalShell
 * still needs to sit inside the shared EmployeeRoute/ProtectedRoute
 * guard chain, not stand alone.
 *
 * IMPORTANT: MODULE_ENTRY_ROUTES.hr in @/lib/activeModule.ts must match
 * the base path here ("/ants-office") -- if this ever changes, update
 * that mapping too, or the connecting-screen redirect will land
 * somewhere stale.
 */
export const hrRoutes: RouteObject[] = [
  {
    element: <OfficeShell />,
    children: [
      { path: "/ants-office", element: <TodayPage /> },
      { path: "/ants-office/reports", element: <ReportsPage /> },
      { path: "/ants-office/reports/new", element: <NewReportPage /> },
      { path: "/ants-office/reports/:id", element: <ReportDetailPage /> },
      { path: "/ants-office/overtime", element: <OvertimePage /> },
      { path: "/ants-office/overtime/:id", element: <OvertimeDetailPage /> },
      { path: "/ants-office/health", element: <HealthPage /> },
      { path: "/ants-office/knowledge", element: <KnowledgeListPage /> },
      { path: "/ants-office/knowledge/new", element: <KnowledgeNewPage /> },
      { path: "/ants-office/knowledge/:id", element: <KnowledgePostPage /> },
      { path: "/ants-office/leave", element: <LeavePage /> },
      { path: "/ants-office/notifications", element: <NotificationsPage /> },
      { path: "/ants-office/invoices/:id", element: <InvoiceDetailPage /> },
      { path: "/ants-office/settings", element: <SettingsPage /> },
    ],
  },
];