"use client";

import { LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { formatLastUpdate } from "@/lib/cards-utils";

interface DashboardHeaderProps {
  userSlug: string;
  lastUpdate: Date | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onClearCache: () => void;
}

export function DashboardHeader({
  userSlug,
  lastUpdate,
  isLoading,
  isRefreshing,
  onRefresh,
  onClearCache,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isDisabled = isRefreshing || isLoading;

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
        <Button disabled={isDisabled} onClick={onRefresh} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Aggiorna carte
        </Button>
        <Button disabled={isDisabled} onClick={onClearCache} variant="outline">
          <Trash2 className="mr-2 h-4 w-4" />
          Pulisci cache
        </Button>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
