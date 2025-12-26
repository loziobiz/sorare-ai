"use client";

import { useServiceWorker } from "@/hooks/use-service-worker";

export function SwRegistration() {
  useServiceWorker();
  return null;
}
