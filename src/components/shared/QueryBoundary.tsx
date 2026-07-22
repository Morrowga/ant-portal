import type { UseQueryResult } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { errorDetail, isPlanGated } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton → 402 "ask your admin" card → error alert → data.
 *  Employees can't reach billing, so a lapsed company plan points at the
 *  admin instead of an upgrade button. */
export function QueryBoundary<T>({ query, children }: {
  query: UseQueryResult<T>; children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (query.isError) {
    if (isPlanGated(query.error)) return <PlanGateCard detail={query.error.detail} />;
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn't load this</AlertTitle>
        <AlertDescription>{errorDetail(query.error)}</AlertDescription>
      </Alert>
    );
  }
  return <>{children(query.data)}</>;
}

export function PlanGateCard({ detail }: { detail?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
          <Lock className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <p className="font-display font-semibold">Feature unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail ?? "Your company's plan doesn't include this."}
            <br />Ask your company admin — plans are managed on the company dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
