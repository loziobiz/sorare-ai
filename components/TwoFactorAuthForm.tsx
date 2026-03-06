"use client";

import { Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithTwoFactor } from "@/lib/auth-server";

interface TwoFactorAuthFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export function TwoFactorAuthForm({
  onSuccess,
  onBack,
}: TwoFactorAuthFormProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithTwoFactor({ data: { otpCode } });

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || "Two-factor authentication failed");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md border-white/10 bg-[#1A1B23] text-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticazione a Due Fattori
        </CardTitle>
        <CardDescription className="text-slate-400">
          Inserisci il codice dal tuo autenticatore per completare l'accesso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="otp">
              Codice di verifica
            </Label>
            <Input
              autoComplete="one-time-code"
              className="border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500"
              disabled={isLoading}
              id="otp"
              maxLength={6}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              type="text"
              value={otpCode}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700"
            disabled={isLoading}
            type="submit"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verifica
          </Button>

          {onBack && (
            <Button
              className="w-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              disabled={isLoading}
              onClick={onBack}
              type="button"
              variant="outline"
            >
              Torna al login
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
