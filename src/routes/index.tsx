import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";
import { TwoFactorAuthForm } from "@/components/TwoFactorAuthForm";
import { Alert } from "@/components/ui/alert";
import { isAuthenticated } from "@/lib/auth-server";

type AuthStep = "login" | "two-factor";

export const Route = createFileRoute("/")({
  component: Home,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      throw redirect({ to: "/cards" });
    }
  },
});

function Home() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [error, setError] = useState("");

  const handleLoginSuccess = () => {
    router.navigate({ to: "/cards" });
  };

  const handleTwoFactorRequired = () => {
    setAuthStep("two-factor");
  };

  const handleTwoFactorSuccess = () => {
    router.navigate({ to: "/cards" });
  };

  const handleBackToLogin = () => {
    setAuthStep("login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-4xl tracking-tight">Sorare AI</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>{error}</div>
          </Alert>
        )}

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
      </div>
    </main>
  );
}
