import { QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterProvider } from "react-router-dom";

import { api } from "@/lib/api-client";
import { AuthContext, decodeClaims, tokenStore, type Claims } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { router } from "@/routes";

export default function App() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [booting, setBooting] = useState(true);

  // Session restore: rotate the persisted refresh token into a fresh
  // in-memory access token on load, same as the dashboard.
  useEffect(() => {
    const refresh = tokenStore.getRefresh();
    if (!refresh) { setBooting(false); return; }
    api.post("/auth/refresh", { refresh_token: refresh })
      .then(({ data }) => {
        tokenStore.setAccess(data.access_token);
        tokenStore.setRefresh(data.refresh_token);
        setClaims(decodeClaims(data.access_token));
      })
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    tokenStore.setAccess(data.access_token);
    tokenStore.setRefresh(data.refresh_token);
    setClaims(decodeClaims(data.access_token));
  }, []);

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => undefined);
    tokenStore.clear();
    queryClient.clear();
    setClaims(null);
    window.location.assign("/login");
  }, []);

  const value = useMemo(() => ({ claims, login, logout }), [claims, login, logout]);

  if (booting) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
