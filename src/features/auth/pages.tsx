import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { errorDetail } from "@/lib/api-client";
import { decodeClaims, tokenStore, useAuth } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(email.trim(), password);
      // Same accounts, same JWT as the dashboard — but this portal is
      // employee-only. Managers/owners get pointed at the dashboard.
      const token = tokenStore.getAccess();
      const role = token ? decodeClaims(token)?.role : null;
      if (role !== "employee") {
        navigate("/not-for-you", { replace: true });
        return;
      }
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? "/portal", { replace: true });
    } catch (err) {
      setError(errorDetail(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-espresso p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5">
          <p className="font-display text-3xl font-bold text-cream">Ants</p>
          <p className="mt-1 text-sm text-latte">Check in, report your day, stay on track.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Employee portal — same account as the mobile app</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={!email || !password || busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Landing spot for manager/owner accounts that signed in here. */
export function NotForYouPage() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-espresso p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 py-8 text-center">
          <p className="font-display text-lg font-semibold">This portal is for employees</p>
          <p className="text-sm text-muted-foreground">
            Your account has manager or owner access — team and company views live on the
            company dashboard, not here.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={logout}>Sign in as someone else</Button>
            <Button asChild><Link to="/login">Back</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
