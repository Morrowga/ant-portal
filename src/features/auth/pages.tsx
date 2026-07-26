import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { errorDetail } from "@/lib/api-client";
import { decodeClaims, tokenStore, useAuth } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

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
      // Don't assume where to land -- EmployeeRoute owns that decision
      // entirely (zero modules -> /no-modules, one -> auto-enters via
      // the connecting screen, multiple -> the real picker). /launch is
      // a NEUTRAL spot with no special-cased behavior of its own -- it
      // always falls into that same general decision logic. /home would
      // be wrong here: it only redirects away once a module is already
      // entered, so a fresh login with just one module would show the
      // picker instead of auto-skipping through it. `from` is still
      // honored when present (a deep link that bounced through /login).
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? "/launch", { replace: true });
    } catch (err) {
      setError(errorDetail(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-espresso p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white">
            <img src={logo} alt="" className="h-12 w-12 object-contain" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-cream">Ants</p>
          {/* <p className="mt-1 text-sm text-latte">Check in, report your day, stay on track.</p> */}
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
              {/* New: same "Have an invite?" link as the mobile app's
                  Login screen, pointing to the new accept-invite flow. */}
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/accept-invite" className="text-primary hover:underline">Have an invite?</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** New: portal equivalent of mobile's AcceptInvite screen -- accepts
 * either the long deep-link-style token or the short human-typed code
 * (e.g. "NORTHWIND-7K2XQ9"). Publicly reachable, same tier as /login. */
export function AcceptInvitePage() {
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await acceptInvite(token.trim(), password, fullName.trim() || undefined);
      // Same reasoning as LoginPage -- a brand-new account has never
      // "entered" anything yet, so land neutrally and let EmployeeRoute
      // decide (auto-enter if one module, /home if several).
      navigate("/launch", { replace: true });
    } catch (err) {
      setError(errorDetail(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-espresso p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white">
            <img src={logo} alt="" className="h-12 w-12 object-contain" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-cream">Ants</p>
          <p className="mt-1 text-sm text-latte">Join your company</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join your company</CardTitle>
            <CardDescription>Enter the invite code your company gave you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="invite-code">Invite code</Label>
                <Input
                  id="invite-code"
                  autoCapitalize="characters"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="e.g. NORTHWIND-7K2XQ9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Your name</Label>
                <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First Last" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Choose a password</Label>
                <Input
                  id="new-password" type="password" autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!token || password.length < 8 || busy}>
                {busy ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
              </p>
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