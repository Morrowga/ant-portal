import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, UserRound } from "lucide-react";
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

const NAV = [
  { to: "/portal", label: "Today", end: true },
  { to: "/portal/reports", label: "Reports" },
  { to: "/portal/health", label: "Health" },
  { to: "/portal/knowledge", label: "Knowledge" },
  { to: "/portal/leave", label: "Leave" },
  { to: "/portal/overtime", label: "Overtime" },
  { to: "/portal/settings", label: "Settings" },
];

/** Simple top-nav layout — deliberately NOT the dashboard's AppShell
 *  sidebar, which is built around Owner/Manager navigation. */
export function PortalShell() {
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
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="relative text-latte hover:bg-white/10 hover:text-white"
              aria-label={`Notifications, ${unread} unread`}
              onClick={() => navigate("/portal/notifications")}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-espresso bg-red-500" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-latte hover:bg-white/10 hover:text-white" aria-label="Account menu">
                  <UserRound className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{me.data?.full_name ?? me.data?.email ?? "Employee portal"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4" /> Sign out
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
              {item.label}
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