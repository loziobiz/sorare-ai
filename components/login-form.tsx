"use client";

import { Loader2 } from "lucide-react";
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
import { login } from "@/lib/auth-server";

interface LoginFormProps {
  onSuccess?: () => void;
  onTwoFactorRequired?: () => void;
}

export function LoginForm({ onSuccess, onTwoFactorRequired }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login({ data: { email, password } });

      if (result.success) {
        // Salva email per identificare l'utente nelle chiamate KV
        localStorage.setItem("sorare_user_email", email.toLowerCase().trim());
        if (result.token) {
          document.cookie = `sorare_jwt_token=${result.token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        }
        onSuccess?.();
      } else if (result.requiresTwoFactor) {
        // Salva email anche per il flusso 2FA
        localStorage.setItem("sorare_user_email", email.toLowerCase().trim());
        if (result.otpChallenge) {
          localStorage.setItem("sorare_otp_challenge", result.otpChallenge);
        }
        onTwoFactorRequired?.();
      } else {
        setError(result.error || "Login failed");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md border-white/10 bg-[#1A1B23] text-slate-200">
      <CardHeader>
        <CardTitle>Accedi</CardTitle>
        <CardDescription className="text-slate-400">
          Inserisci la tua email Sorare e la password per accedere
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="email">
              Email
            </Label>
            <Input
              autoComplete="email"
              className="border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500"
              disabled={isLoading}
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="password">
              Password
            </Label>
            <Input
              className="border-white/10 bg-white/5 text-slate-200"
              disabled={isLoading}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
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
            Accedi
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
