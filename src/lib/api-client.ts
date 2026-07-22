/**
 * Single API client — same pattern as the dashboard's src/lib/api-client.ts:
 * in-memory access token, one refresh-token rotation on 401 with request
 * replay, 402 mapped to PlanGateError. Screens never call axios directly.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { tokenStore } from "./auth";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class PlanGateError extends Error {
  readonly planGated = true;
  constructor(public detail: string) { super(detail); }
}

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

async function rotateRefreshToken(): Promise<string> {
  const refresh_token = tokenStore.getRefresh();
  if (!refresh_token) throw new Error("No refresh token");
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token });
  tokenStore.setAccess(data.access_token);
  tokenStore.setRefresh(data.refresh_token); // rotation: old refresh token is dead
  return data.access_token as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: unknown }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 402) {
      throw new PlanGateError(errorDetail(error));
    }
    if (error.response?.status === 401 && original && !original._retried
        && !original.url?.includes("/auth/")) {
      original._retried = true;
      try {
        refreshing = refreshing ?? rotateRefreshToken();
        const token = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        refreshing = null;
        tokenStore.clear();
        window.location.assign("/login");
      }
    }
    throw error;
  },
);

export function isPlanGated(error: unknown): error is PlanGateError {
  return error instanceof PlanGateError;
}

/** FastAPI `detail` can be a string OR an array of validation objects (422). */
export function errorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join("; ");
    }
    if (detail && typeof detail === "object") return JSON.stringify(detail);
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
