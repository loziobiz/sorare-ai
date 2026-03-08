"use client";

import { AlertTriangle } from "lucide-react";
import { formatLastUpdate } from "@/lib/cards-utils";
import type { SyncStatusResponse } from "@/lib/kv-types";

const STALE_DATA_DAYS = 7;

function isLastSyncStale(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) {
    return true;
  }
  const syncDate = new Date(lastSyncAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DATA_DAYS);
  return syncDate < cutoff;
}

interface DashboardHeaderProps {
  userSlug: string;
  lastUpdate: Date | null;
  syncStatus: SyncStatusResponse | null;
}

export function DashboardHeader({
  userSlug,
  lastUpdate,
  syncStatus,
}: DashboardHeaderProps) {
  const tokenExpiringSoon =
    syncStatus?.hasToken && syncStatus.expiresInDays < 3;
  const dataStale = syncStatus && isLastSyncStale(syncStatus.lastSyncAt);

  return (
    <div className="space-y-2">
      {(tokenExpiringSoon || dataStale) && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
          {tokenExpiringSoon && (
            <p className="flex items-center gap-2 text-amber-600 text-sm dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Token in scadenza, rieffettua il login
            </p>
          )}
          {dataStale && !tokenExpiringSoon && (
            <p className="flex items-center gap-2 text-amber-600 text-sm dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Dati obsoleti, aggiorna ora
            </p>
          )}
        </div>
      )}
      <div>
        <h1 className="font-bold text-3xl">YASM Dashboard</h1>
        <p className="text-muted-foreground">
          {userSlug && `Benvenuto, ${userSlug}`}
          {lastUpdate && (
            <span className="ml-2 text-sm">
              · Updated {formatLastUpdate(lastUpdate)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
