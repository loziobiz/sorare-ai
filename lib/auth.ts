'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createGraphQLClient } from './graphql/client';
import { SIGN_IN_MUTATION } from './graphql/mutations';
import type { SignInInput, SignInResponse } from './types';

const COOKIE_NAME = 'sorare_jwt_token';
const COOKIE_OTP_CHALLENGE = 'sorare_otp_challenge';

const SORARE_API_BASE = 'https://api.sorare.com';

/**
 * Recupera il salt per l'hashing della password dall'API Sorare
 */
async function getSalt(email: string): Promise<string> {
  const response = await fetch(`${SORARE_API_BASE}/api/v1/users/${encodeURIComponent(email)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch salt: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.salt) {
    throw new Error('No salt returned from Sorare API');
  }

  return data.salt;
}

/**
 * Hasha la password usando bcrypt con il salt fornito da Sorare
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  return await bcrypt.hash(password, salt);
}

/**
 * Risposta standardizzata per le azioni di autenticazione
 */
export interface AuthResult {
  success: boolean;
  error?: string;
  requiresTwoFactor?: boolean;
  user?: {
    slug: string;
  };
}

/**
 * Ottieni il token JWT dai cookies
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

/**
 * Ottieni l'OTP challenge dai cookies
 */
export async function getOtpChallenge(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_OTP_CHALLENGE)?.value;
}

/**
 * Imposta il token JWT nei cookies (HTTP-only)
 */
export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
  });
}

/**
 * Imposta l'OTP challenge nei cookies (HTTP-only)
 */
export async function setOtpChallenge(challenge: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_OTP_CHALLENGE,
    value: challenge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minuti
  });
}

/**
 * Rimuovi token e OTP challenge dai cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(COOKIE_OTP_CHALLENGE);
}

/**
 * Verifica se l'utente è autenticato
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * Login prima fase: email e password
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    // Recupera il salt per l'email
    const salt = await getSalt(email);

    // Hasha la password con il salt
    const hashedPassword = await hashPassword(password, salt);

    const client = createGraphQLClient();

    const variables = {
      input: {
        email,
        password: hashedPassword,
      } as SignInInput,
    };

    const response = await client.request<{ signIn: SignInResponse }>(
      SIGN_IN_MUTATION,
      variables
    );

    const signInData = response.signIn;

    // Log per debug della risposta completa
    console.log('SignIn response:', JSON.stringify(signInData, null, 2));

    // Prima controlla se richiede 2FA (ha la precedenza sugli errori)
    if (signInData.otpSessionChallenge) {
      await setOtpChallenge(signInData.otpSessionChallenge);
      return {
        success: false,
        requiresTwoFactor: true,
      };
    }

    // Controlla errori (ignora l'errore 2fa_missing se c'è un otpSessionChallenge)
    if (signInData.errors && signInData.errors.length > 0) {
      // Se l'errore è "2fa_missing", potrebbe significare che serve 2FA ma non abbiamo ricevuto il challenge
      const has2faError = signInData.errors.some(e =>
        e.code === '2fa_missing' || e.message?.includes('2fa')
      );

      if (has2faError) {
        return {
          success: false,
          error: 'Two-factor authentication is required. Please use your authenticator app.',
        };
      }

      const errorMsg = signInData.errors.map(e => e.message).join(', ');
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Login completato senza 2FA
    if (signInData.jwtToken?.token) {
      await setAuthToken(signInData.jwtToken.token);
      return {
        success: true,
        user: {
          slug: signInData.currentUser.slug,
        },
      };
    }

    // Caso non previsto
    return {
      success: false,
      error: 'Unexpected response from server',
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

/**
 * Login seconda fase: codice 2FA
 */
export async function loginWithTwoFactor(otpCode: string): Promise<AuthResult> {
  try {
    const otpChallenge = await getOtpChallenge();

    if (!otpChallenge) {
      return {
        success: false,
        error: 'No 2FA challenge found. Please start login again.',
      };
    }

    const client = createGraphQLClient();

    const variables = {
      input: {
        otpAttempt: otpCode,
        otpSessionChallenge: otpChallenge,
      } as SignInInput,
    };

    const response = await client.request<{ signIn: SignInResponse }>(
      SIGN_IN_MUTATION,
      variables
    );

    const signInData = response.signIn;

    // Controlla errori
    if (signInData.errors && signInData.errors.length > 0) {
      const errorMsg = signInData.errors.map(e => e.message).join(', ');
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Login completato
    if (signInData.jwtToken?.token) {
      await setAuthToken(signInData.jwtToken.token);
      // Pulisci l'OTP challenge
      const cookieStore = await cookies();
      cookieStore.delete(COOKIE_OTP_CHALLENGE);

      return {
        success: true,
        user: {
          slug: signInData.currentUser.slug,
        },
      };
    }

    // Caso non previsto
    return {
      success: false,
      error: 'Unexpected response from server',
    };
  } catch (error) {
    console.error('2FA login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Two-factor authentication failed',
    };
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await clearAuthCookies();
}

