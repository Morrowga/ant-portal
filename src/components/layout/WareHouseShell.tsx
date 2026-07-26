import { LogOut } from "lucide-react";
import { Outlet } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

/**
 * Warehouse module's own shell -- deliberately separate from
 * PortalShell (HR's shell), same reasoning HR's own shell is separate
 * from the dashboard's AppShell: each module's nav is specific to that
 * module's own screens.
 *
 * Starter version: no module-specific nav items yet (there's only one
 * page). Add a NAV array here the same way PortalShell has one, once
 * Warehouse has more than one screen.
 *
 * TODO: Exit-to-Home isn't wired in here yet -- HR's version lives
 * inside its own SettingsPage, which Warehouse doesn't have yet. Add an
 * Exit action here (clearActiveModule() + navigate("/home")) once
 * there's a natural place for it -- a account menu item is the
 * simplest starting point, same as Sign out below.
 */
export function WarehouseShell() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-espresso">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-1.5">
            <div className="rounded-md bg-white p-1">
              <img src={logo} alt="" className="h-5 w-auto" />
            </div>
            <span className="font-display text-lg font-bold text-cream">Ants — Warehouse</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-latte hover:bg-white/10 hover:text-white" aria-label="Account menu">
                <LogOut className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Warehouse</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}