import { QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterProvider } from "react-router-dom";

import { api } from "@/lib/api-client";
import { AuthContext, decodeClaims, tokenStore, type Claims } from "@/lib/auth";
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
    await fetchMe();
  }, [fetchMe]);

  // New: mirrors login() above, but hits /auth/accept-invite instead.
  // After success the account behaves exactly like a fresh sign-in --
  // same token persistence, same /me fetch, same onboarding gate applies
  // downstream via EmployeeRoute.
  const acceptInvite = useCallback(async (token: string, password: string, fullName?: string) => {
    const { data } = await api.post("/auth/accept-invite", {
      token, password, full_name: fullName || null,
    });
    tokenStore.setAccess(data.access_token);
    tokenStore.setRefresh(data.refresh_token);
    setClaims(decodeClaims(data.access_token));
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => undefined);
    tokenStore.clear();
    queryClient.clear();
    setClaims(null);
    setMe(null);
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