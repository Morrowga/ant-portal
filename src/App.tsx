import { QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterProvider } from "react-router-dom";

import { api } from "@/lib/api-client";
import { AuthContext, decodeClaims, tokenStore, type Claims } from "@/lib/auth";
import { clearActiveModule } from "@/lib/activeModule";
import i18n from "@/lib/i18n";
import "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { router } from "@/routes";
import type { Me } from "@/lib/types";

function syncLanguage(me: Me) {
  if (me.language && me.language !== i18n.language) {
    void i18n.changeLanguage(me.language);
  }
}

export default function App() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get<Me>("/me");
    setMe(data);
    syncLanguage(data);
    return data;
  }, []);

  // Session restore on reload -- NOT a fresh login, so activeModule is
  // deliberately left untouched here: someone mid-session refreshing the
  // page should stay exactly where they were, not get bounced back
  // through the connecting screen every time.
  useEffect(() => {
    const refresh = tokenStore.getRefresh();
    if (!refresh) { setBooting(false); return; }
    api.post("/auth/refresh", { refresh_token: refresh })
      .then(async ({ data }) => {
        tokenStore.setAccess(data.access_token);
        tokenStore.setRefresh(data.refresh_token);
        setClaims(decodeClaims(data.access_token));
        await fetchMe();
      })
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, [fetchMe]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && tokenStore.getAccess()) {
        fetchMe().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    tokenStore.setAccess(data.access_token);
    tokenStore.setRefresh(data.refresh_token);
    setClaims(decodeClaims(data.access_token));
    // A fresh, explicit login is a real "entering" moment -- clear any
    // stale activeModule from a PREVIOUS session (this browser, an
    // earlier login, possibly even a different account entirely on a
    // shared machine) so EmployeeRoute re-decides from scratch and the
    // connecting screen shows correctly, instead of silently reusing
    // whatever was left over from before.
    clearActiveModule();
    await fetchMe();
  }, [fetchMe]);

  // New: mirrors login() above, but hits /auth/accept-invite instead.
  // After success the account behaves exactly like a fresh sign-in --
  // same token persistence, same /me fetch, same onboarding gate applies
  // downstream via EmployeeRoute. Same reasoning for clearActiveModule()
  // here too -- a brand-new account has definitely never "entered"
  // anything yet.
  const acceptInvite = useCallback(async (token: string, password: string, fullName?: string) => {
    const { data } = await api.post("/auth/accept-invite", {
      token, password, full_name: fullName || null,
    });
    tokenStore.setAccess(data.access_token);
    tokenStore.setRefresh(data.refresh_token);
    setClaims(decodeClaims(data.access_token));
    clearActiveModule();
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => undefined);
    tokenStore.clear();
    queryClient.clear();
    setClaims(null);
    setMe(null);
    // Also clear here, not just on login -- without this, on a SHARED
    // browser, a different person logging in next would inherit this
    // session's activeModule and incorrectly skip the connecting screen
    // as if they'd already entered something themselves.
    clearActiveModule();
    window.location.assign("/login");
  }, []);

  const onboarded = !!me?.onboarding_completed_at;

  const value = useMemo(
    () => ({ claims, me, onboarded, login, acceptInvite, logout, refreshMe: fetchMe }),
    [claims, me, onboarded, login, acceptInvite, logout, fetchMe],
  );

  if (booting) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

// APP