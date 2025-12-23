'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';
import { TwoFactorAuthForm } from '@/components/TwoFactorAuthForm';
import { Alert } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type AuthStep = 'login' | 'two-factor';

export default function Home() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();

      if (authenticated) {
        // Se l'utente è già autenticato, redirect alla dashboard
        router.push('/cards');
      } else {
        setIsChecking(false);
      }
    } catch (err) {
      setError('Failed to check authentication status');
      setIsChecking(false);
    }
  };

  const handleLoginSuccess = () => {
    router.push('/cards');
  };

  const handleTwoFactorRequired = () => {
    setAuthStep('two-factor');
  };

  const handleTwoFactorSuccess = () => {
    router.push('/cards');
  };

  const handleBackToLogin = () => {
    setAuthStep('login');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Sorare AI</h1>
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
        {authStep === 'login' ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onTwoFactorRequired={handleTwoFactorRequired}
          />
        ) : (
          <TwoFactorAuthForm
            onSuccess={handleTwoFactorSuccess}
            onBack={handleBackToLogin}
          />
        )}

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Applicazione MVP per interazione con l'API Sorare</p>
          <p className="mt-2">
            Le query GraphQL vengono eseguite server-to-server per maggiore sicurezza
          </p>
        </div>
      </div>
    </main>
  );
}
