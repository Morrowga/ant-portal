/**
 * Same token approach as the dashboard: access token in MEMORY only,
 * refresh token persisted + rotated on every refresh. Same login endpoint,
 * same JWT — employees already have accounts through the invite system.
 */
import { jwtDecode } from "jwt-decode";
import { createContext, useContext } from "react";
import type { Me } from "./types";

export type Role = "owner_admin" | "manager" | "employee";

export interface Claims {
  sub: string;
  company_id: number;
  role: Role;
  team_id?: number | null;
  exp: number;
}

const REFRESH_KEY = "ants.portal.refresh_token";
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (token: string | null) => { accessToken = token; },
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string | null) =>
    token ? localStorage.setItem(REFRESH_KEY, token) : localStorage.removeItem(REFRESH_KEY),
  clear() { accessToken = null; localStorage.removeItem(REFRESH_KEY); },
};

export function decodeClaims(token: string): Claims | null {
  try { return jwtDecode<Claims>(token); } catch { return null; }
}

export interface AuthState {
  claims: Claims | null;
  me: Me | null;
  onboarded: boolean;
  login: (email: string, password: string) => Promise<void>;
  // New: mirrors mobile's acceptInvite -- accepts either the long deep-link
  // token or the short human-typed code (e.g. "NORTHWIND-7K2XQ9"); the
  // backend's accept_invite() already tries both against the same input.
  acceptInvite: (token: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<Me>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}