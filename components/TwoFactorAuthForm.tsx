'use client';

import { useState } from 'react';
import { loginWithTwoFactor } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';

interface TwoFactorAuthFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export function TwoFactorAuthForm({ onSuccess, onBack }: TwoFactorAuthFormProps) {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await loginWithTwoFactor(otpCode);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Two-factor authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticazione a Due Fattori
        </CardTitle>
        <CardDescription>
          Inserisci il codice dal tuo autenticatore per completare l'accesso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Codice di verifica</Label>
            <Input
              id="otp"
              type="text"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              disabled={isLoading}
              maxLength={6}
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verifica
          </Button>

          {onBack && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBack}
              disabled={isLoading}
            >
              Torna al login
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

