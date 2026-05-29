"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api";

type BackendStatus = "checking" | "online" | "offline";

export function BackendStatusBadge() {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let active = true;

    async function checkBackend() {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${API_BASE_URL}/`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        window.clearTimeout(timer);

        if (!active) return;
        setStatus(response.ok ? "online" : "offline");
      } catch {
        if (!active) return;
        setStatus("offline");
      }
    }

    checkBackend();
    const interval = window.setInterval(checkBackend, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (status === "online") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
        <Wifi className="h-3.5 w-3.5" />
        Backend ulangan
      </Badge>
    );
  }

  if (status === "offline") {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3.5 w-3.5" />
        Backend offline
      </Badge>
    );
  }

  return <Badge variant="secondary">Tekshirilmoqda...</Badge>;
}
