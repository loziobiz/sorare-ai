"use client";

import { useRouter } from "@tanstack/react-router";
import { LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth-server";
import { formatLastUpdate } from "@/lib/cards-utils";
import { clearUserEmail } from "@/lib/user-id";

interface DashboardHeaderProps {
  userSlug: string;
  lastUpdate: Date | null;
  isLoading: boolean;
  isSyncing: boolean;
  onSync: () => void;
}

export function DashboardHeader({
  userSlug,
  lastUpdate,
  isLoading,
  isSyncing,
  onSync,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    clearUserEmail();
    router.navigate({ to: "/" });
  };

  const isDisabled = isSyncing || isLoading;

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-bold text-3xl">Sorare AI Dashboard</h1>
        <p className="text-muted-foreground">
          {userSlug && `Benvenuto, ${userSlug}`}
          {lastUpdate && (
            <span className="ml-2 text-sm">
              · Updated {formatLastUpdate(lastUpdate)}
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
          disabled={isDisabled}
          onClick={onSync}
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
          />
          Aggiorna carte
        </Button>
        <Button
          className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
          variant="outline"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
