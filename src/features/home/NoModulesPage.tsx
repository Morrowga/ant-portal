import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function NoModulesPage() {
  const { logout } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Oops ! Sorry</h1>
      <p className="text-sm text-muted-foreground">
        Your company hasn't turned on any modules for you yet. Please contact to your admin team.
      </p>
      <Button variant="outline" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}