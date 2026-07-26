import type { RouteObject } from "react-router-dom";

import { WarehouseShell } from "@/components/layout/WareHouseShell";
import { WarehouseHomePage } from "@/features/warehouse/WarehouseHomePage";

/**
 * The Warehouse module's own routes -- same pattern as
 * @/features/hr/hrRoutes.tsx. Starter version: one page. Add more
 * WarehouseShell children here as Warehouse grows, exactly the way HR's
 * routes grew from one page to fourteen.
 *
 * IMPORTANT: MODULE_ENTRY_ROUTES.warehouse in @/lib/activeModule.ts
 * must match the base path here ("/ants-warehouse") -- if this ever
 * changes, update that mapping too, or the connecting-screen redirect
 * will land somewhere stale.
 */
export const warehouseRoutes: RouteObject[] = [
  {
    element: <WarehouseShell />,
    children: [
      { path: "/ants-warehouse", element: <WarehouseHomePage /> },
    ],
  },
];