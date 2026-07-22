/**
 * Notification center — list + auto-mark-as-read on page entry (no need
 * to click each one individually; visiting this page IS the "read" action,
 * same as most notification centers work). Desk-location decision
 * notifications remain visible here even though the Desk Location feature is
 * excluded from the portal; per product decision they're plain notifications
 * with no click-through destination (nothing in the current type set
 * navigates anywhere on web).
 */
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { fmtStamp } from "@/lib/format";
import type { Notification } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyText } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

export function NotificationsPage() {
  const qc = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: async () => (await api.get<Notification[]>("/notifications/me")).data,
  });
  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
  });

  // Fires once per page visit, only for whatever's unread at that moment --
  // the ref guards against re-firing on background refetches (e.g. the
  // 60s poll in PortalShell) after the first pass already ran.
  const hasMarkedRef = useRef(false);
  useEffect(() => {
    if (hasMarkedRef.current || !notifications.data) return;
    const unread = notifications.data.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    hasMarkedRef.current = true;
    Promise.all(unread.map((n) => markRead.mutateAsync(n.id))).then(() => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [notifications.data, markRead, qc]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <QueryBoundary query={notifications}>
        {(rows) => (
          <div className="mt-4 space-y-2">
            {rows.length === 0 && <EmptyText>All quiet.</EmptyText>}
            {rows.map((notification) => (
              <Card key={notification.id} className={notification.read_at ? "opacity-60" : undefined}>
                <CardContent className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{notification.title}</p>
                    <Badge variant="secondary">{notification.category.replaceAll("_", " ")}</Badge>
                  </div>
                  {notification.body && (
                    <p className="mt-1 text-[13px] text-muted-foreground">{notification.body}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground tabular">{fmtStamp(notification.created_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}