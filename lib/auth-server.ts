import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import { createGraphQLClient } from "./graphql/client";
import { SIGN_IN_MUTATION } from "./graphql/mutations";
import type { SignInInput, SignInResponse } from "./types";

const COOKIE_NAME = "sorare_jwt_token";
const COOKIE_OTP_CHALLENGE = "sorare_otp_challenge";
const SORARE_API_BASE = "https://api.sorare.com";

async function getSalt(email: string): Promise<string> {
  const response = await fetch(
    `${SORARE_API_BASE}/api/v1/users/${encodeURIComponent(email)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch salt: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.salt) {
    throw new Error("No salt returned from Sorare API");
  }
  return data.salt;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return await bcrypt.hash(password, salt);
}

export interface AuthResult {
  success: boolean;
  error?: string;
  requiresTwoFactor?: boolean;
  user?: { slug: string };
}

export const getAuthToken = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | undefined> => getCookie(COOKIE_NAME)
);

export const getOtpChallenge = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | undefined> => getCookie(COOKIE_OTP_CHALLENGE)
);

function setAuthToken(token: string): void {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

function setOtpChallenge(challenge: string): void {
  setCookie(COOKIE_OTP_CHALLENGE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
}

export const isAuthenticated = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => !!getCookie(COOKIE_NAME)
);

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<AuthResult> => {
    try {
      const salt = await getSalt(data.email);
      const hashedPassword = await hashPassword(data.password, salt);
      const client = createGraphQLClient();
      const variables = { input: { email: data.email, password: hashedPassword } as SignInInput };
      const response = await client.request<{ signIn: SignInResponse }>(SIGN_IN_MUTATION, variables);
      const signInData = response.signIn;

      if (signInData.otpSessionChallenge) {
        setOtpChallenge(signInData.otpSessionChallenge);
        return { success: false, requiresTwoFactor: true };
      }

      if (signInData.errors?.length) {
        const has2faError = signInData.errors.some(
          (e) => e.code === "2fa_missing" || e.message?.includes("2fa")
        );
        if (has2faError) {
          return { success: false, error: "Two-factor authentication is required." };
        }
        return { success: false, error: signInData.errors.map((e) => e.message).join(", ") };
      }

      if (signInData.jwtToken?.token && signInData.currentUser) {
        setAuthToken(signInData.jwtToken.token);
        return { success: true, user: { slug: signInData.currentUser.slug } };
      }
      return { success: false, error: "Unexpected response" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Login failed" };
    }
  });

export const loginWithTwoFactor = createServerFn({ method: "POST" })
  .inputValidator((data: { otpCode: string }) => data)
  .handler(async ({ data }): Promise<AuthResult> => {
    try {
      const otpChallenge = getCookie(COOKIE_OTP_CHALLENGE);
      if (!otpChallenge) {
        return { success: false, error: "No 2FA challenge found." };
      }
      const client = createGraphQLClient();
      const variables = {
        input: { otpAttempt: data.otpCode, otpSessionChallenge: otpChallenge } as SignInInput,
      };
      const response = await client.request<{ signIn: SignInResponse }>(SIGN_IN_MUTATION, variables);
      const signInData = response.signIn;

      if (signInData.errors?.length) {
        return { success: false, error: signInData.errors.map((e) => e.message).join(", ") };
      }

      if (signInData.jwtToken?.token && signInData.currentUser) {
        setAuthToken(signInData.jwtToken.token);
        deleteCookie(COOKIE_OTP_CHALLENGE);
        return { success: true, user: { slug: signInData.currentUser.slug } };
      }
      return { success: false, error: "Unexpected response" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "2FA failed" };
    }
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE_NAME);
  deleteCookie(COOKIE_OTP_CHALLENGE);
});
