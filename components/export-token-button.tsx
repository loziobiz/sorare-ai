"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function ExportTokenButton() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);

    // Look for CLI token cookie or localStorage
    const possibleKeys = [
      "sorare_cli_token",
      "sorare:token",
      "sorare_token",
      "jwt",
      "token",
    ];

    let token: string | null = null;

    // Check localStorage first
    for (const key of possibleKeys) {
      token = localStorage.getItem(key);
      if (token) break;
    }

    // Check cookies
    if (!token) {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (
          name === "sorare_cli_token" ||
          name?.toLowerCase().includes("token") ||
          name?.toLowerCase().includes("jwt")
        ) {
          token = decodeURIComponent(value || "");
          if (token.startsWith("eyJ")) break;
        }
      }
    }

    if (!token || !token.startsWith("eyJ")) {
      setError("Token not found. Please logout and login again.");
      return;
    }

    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy JWT Token
          </>
        )}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
