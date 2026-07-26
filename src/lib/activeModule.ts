/**
 * Tracks which module the employee is currently "inside," so the portal
 * can enforce one module at a time. Once set (by entering a module from
 * Home, or auto-set when there's only one), Home is unreachable until
 * Exit (in Settings) explicitly clears it.
 *
 * Deliberately NOT part of the auth session: clearing this does not log
 * anyone out, and logging out doesn't need to clear this either --
 * tokenStore.clear() already sends them to /login, making this moot.
 *
 * IMPORTANT: this is the ONLY copy of this file. There was previously
 * also a "@/lib/active-module" (hyphenated) that EmployeeRoute.tsx
 * imported from by mistake, silently diverging from every other file
 * that imports "@/lib/activeModule" (this one). DELETE
 * src/lib/active-module.ts if it still exists in the project -- it
 * should not exist alongside this file.
 */
import hrImage from "@/assets/hr-b.png";
import wrImage from "@/assets/wh-b.png";

const ACTIVE_MODULE_KEY = "ants.portal.active_module";

export function getActiveModule(): string | null {
  return localStorage.getItem(ACTIVE_MODULE_KEY);
}

export function setActiveModule(moduleKey: string): void {
  localStorage.setItem(ACTIVE_MODULE_KEY, moduleKey);
}

export function clearActiveModule(): void {
  localStorage.removeItem(ACTIVE_MODULE_KEY);
}

/** Where "Enter" for each module actually goes. */
export const MODULE_ENTRY_ROUTES: Record<string, string> = {
  hr: "/ants-office",
  warehouse: "/ants-warehouse",
};

export const MODULE_LABELS: Record<string, string> = {
  hr: "Office HR",
  warehouse: "Warehouse",
};

/** Per-module illustration/icon shown on Home's picker cards. */
export const MODULE_IMAGES: Record<string, string> = {
  hr: hrImage,
  warehouse: wrImage,
};