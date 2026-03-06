"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { CreditCard, Layers, Save, Settings, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number | null;
}

interface SiteNavProps {
  className?: string;
}

/**
 * Navigation principale del sito.
 * Posizionata in alto con border-bottom.
 */
export function SiteNav({ className }: SiteNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const [savedLineupsCount, setSavedLineupsCount] = useState<number | null>(
    null
  );

  useEffect(() => {
    const loadCount = async () => {
      try {
        const formations = await db.savedFormations.toArray();
        setSavedLineupsCount(formations.length);
      } catch {
        setSavedLineupsCount(null);
      }
    };
    loadCount();
  }, []);

  const navItems: NavItem[] = [
    { href: "/cards", label: "My Cards", icon: CreditCard },
    { href: "/lineup", label: "Create Team", icon: Layers },
    {
      href: "/saved-lineups",
      label:
        savedLineupsCount !== null
          ? `Saved Teams (${savedLineupsCount})`
          : "Saved Teams",
      icon: Save,
    },
    { href: "/results", label: "Results", icon: Trophy },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      className={cn(
        "flex w-full items-center justify-center gap-1 border-white/5 border-b bg-[#1A1B23] px-4",
        className
      )}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            className={cn(
              "flex flex-col items-center justify-center gap-1 border-t-2 px-6 py-3 font-medium text-xs transition-colors sm:text-sm",
              isActive
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
            key={item.href}
            to={item.href}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
