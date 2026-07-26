import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { listenForForegroundMessages, requestPushToken } from "@/lib/firebase";
import logo from "@/assets/logo.png";

function routeForType(type: string | undefined, data: Record<string, string>): string | null {
  switch (type) {
    case "sleep_checkin":
    case "mood_water_checkin":
      return "/ants-office/health";
    case "presence_check":
      // No dedicated route anymore — presence checks only ever show on
      // Today, driven by polled status. Just send them there.
      return "/portal";
    case "overtime_request":
    case "overtime_decision":
      return "/ants-office/overtime";
    default:
      return null;
  }
}

export function usePushNotifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    requestPushToken().then((token) => {
      if (!token || cancelled) return;
      api.post("/notifications/register-device", { fcm_token: token, platform: "web" })
        .catch((err) => console.warn("Failed to register push token (non-fatal):", err));
    });

    listenForForegroundMessages((title, body, data) => {
      if (cancelled) return;

      // Make the in-app state catch up immediately instead of waiting on
      // the 60s poll — this is what makes the presence-check dialog (and
      // anything else driven by attendance status) appear right away even
      // if you're already sitting on the page the push relates to.
      if (data.type === "presence_check") {
        qc.invalidateQueries({ queryKey: ["attendance", "status"] });
      }

      const notification = new Notification(title, { body, icon: logo, requireInteraction: true });
      notification.onclick = () => {
        window.focus();
        const destination = routeForType(data.type, data);
        if (destination) navigate(destination);
        notification.close();
      };
    });

    return () => { cancelled = true; };
  }, [navigate, qc]);
}