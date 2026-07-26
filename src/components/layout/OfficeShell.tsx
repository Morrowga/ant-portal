import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Me, Notification } from "@/lib/types";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { usePresenceHeartbeat } from "@/lib/usePresenceHeartbeat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

/** labelKey resolves under nav.* -- actual display text comes from i18n,
 * not hardcoded here, so it follows whatever language PortalShell syncs
 * to below once GET /me resolves.
 *
 * Base path is /ants-office (was /portal) -- this is the HR module's own
 * shell, so these links are legitimately HR-specific, unlike the
 * module-agnostic /launch, /home, /entering/:key, /no-modules routes. */
const NAV = [
  { to: "/ants-office", labelKey: "today", end: true },
  { to: "/ants-office/reports", labelKey: "reports" },
  { to: "/ants-office/health", labelKey: "health" },
  { to: "/ants-office/knowledge", labelKey: "knowledge" },
  { to: "/ants-office/leave", labelKey: "leave" },
  { to: "/ants-office/overtime", labelKey: "overtime" },
  { to: "/ants-office/settings", labelKey: "settings" },
];

/** Simple top-nav layout — deliberately NOT the dashboard's AppShell
 *  sidebar, which is built around Owner/Manager navigation. */
export function OfficeShell() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<Me>("/me")).data,
  });
  usePushNotifications();
  usePresenceHeartbeat();
  const notifications = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: async () => (await api.get<Notification[]>("/notifications/me")).data,
    refetchInterval: 60_000,
  });
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;

  /** Sync the active i18n language to whatever this employee is actually
   * assigned once /me resolves. This is the ONLY place the portal decides
   * its display language on load -- everywhere else (Settings' toggle)
   * just changes it going forward from here. Guarded by a language
   * mismatch check so this doesn't re-trigger every refetch. */
  useEffect(() => {
    if (me.data?.language && me.data.language !== i18n.language) {
      i18n.changeLanguage(me.data.language);
    }
  }, [me.data?.language, i18n]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-espresso">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <div className="rounded-md bg-white p-1">
                <img src={logo} alt="" className="h-5 w-auto" />
              </div>
              <span className="font-display text-lg font-bold text-cream">Ants</span>
            </div>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                      isActive ? "bg-white/15 font-medium text-white" : "text-latte hover:bg-white/10 hover:text-white",
                    )
                  }
                >
                  {t(`nav.${item.labelKey}`)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="relative text-latte hover:bg-white/10 hover:text-white"
              aria-label={t("shell.notificationsAriaLabel", { count: unread })}
              onClick={() => navigate("/ants-office/notifications")}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-espresso bg-red-500" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-latte hover:bg-white/10 hover:text-white" aria-label={t("common.accountMenu")}>
                  <UserRound className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{me.data?.full_name ?? me.data?.email ?? t("common.employeePortal")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4" /> {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Mobile-width nav row */}
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-md px-3 py-1 text-[13px]",
                  isActive ? "bg-white/15 font-medium text-white" : "text-latte",
                )
              }
            >
              {t(`nav.${item.labelKey}`)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}