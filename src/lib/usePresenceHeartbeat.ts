import { useEffect } from "react";

import { api } from "@/lib/api-client";

const HEARTBEAT_INTERVAL_MS = 45_000;

/** Without this, notification_service.send()'s _active_platform() never
 * sees "web" as active in Redis, and defaults to "mobile" every time --
 * meaning a web-registered device token never gets used, even when
 * correctly registered. Call once from PortalShell. */
export function usePresenceHeartbeat() {
  useEffect(() => {
    const send = () => {
      api.post("/presence/heartbeat", { platform: "web", app_state: "active" }).catch(() => undefined);
    };
    send();
    const id = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}