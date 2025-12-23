"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { TwoFactorAuthForm } from "@/components/TwoFactorAuthForm";
import { Alert } from "@/components/ui/alert";
import { isAuthenticated } from "@/lib/auth";

type AuthStep = "login" | "two-factor";

export default function Home() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();

      if (authenticated) {
        // Se l'utente è già autenticato, redirect alla dashboard
        router.push("/cards");
      } else {
        setIsChecking(false);
      }
    } catch (err) {
      setError("Failed to check authentication status");
      setIsChecking(false);
    }
  };

  const handleLoginSuccess = () => {
    router.push("/cards");
  };

  const handleTwoFactorRequired = () => {
    setAuthStep("two-factor");
  };

  const handleTwoFactorSuccess = () => {
    router.push("/cards");
  };

  const handleBackToLogin = () => {
    setAuthStep("login");
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent border-solid motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">
            Verifica autenticazione...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-4xl tracking-tight">Sorare AI</h1>
          <p className="text-muted-foreground">
            Gestisci la tua collezione di carte collezionabili
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>{error}</div>
          </Alert>
        )}

        {/* Auth Forms */}
        {authStep === "login" ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onTwoFactorRequired={handleTwoFactorRequired}
          />
        ) : (
          <TwoFactorAuthForm
            onBack={handleBackToLogin}
            onSuccess={handleTwoFactorSuccess}
          />
        )}

        {/* Footer Info */}
        <div className="text-center text-muted-foreground text-sm">
          <p>Applicazione MVP per interazione con l'API Sorare</p>
          <p className="mt-2">
            Le query GraphQL vengono eseguite server-to-server per maggiore
            sicurezza
          </p>
        </div>
      </div>
    </main>
  );
}
