import { c as createServerRpc, a as createGraphQLClient } from "./client-DBwjQyw9.js";
import bcrypt from "bcryptjs";
import { c as createServerFn, g as getCookie, d as deleteCookie, s as setCookie } from "../server.js";
import "graphql-request";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@tanstack/react-router";
const SIGN_IN_MUTATION = `
  mutation signIn($input: signInInput!) {
    signIn(input: $input) {
      currentUser {
        slug
      }
      jwtToken(aud: "sorare-ai") {
        token
        expiredAt
      }
      otpSessionChallenge
      errors {
        message
        code
      }
    }
  }
`;
const COOKIE_NAME = "sorare_jwt_token";
const COOKIE_OTP_CHALLENGE = "sorare_otp_challenge";
const SORARE_API_BASE = "https://api.sorare.com";
async function getSalt(email) {
  const response = await fetch(`${SORARE_API_BASE}/api/v1/users/${encodeURIComponent(email)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch salt: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.salt) {
    throw new Error("No salt returned from Sorare API");
  }
  return data.salt;
}
async function hashPassword(password, salt) {
  return await bcrypt.hash(password, salt);
}
const getAuthToken_createServerFn_handler = createServerRpc({
  id: "338fa27ae3120c7fe66337d2fae279a327ce8fd59d688bf62b75de6ad23e48c2",
  name: "getAuthToken",
  filename: "lib/auth-server.ts"
}, (opts) => getAuthToken.__executeServer(opts));
const getAuthToken = createServerFn({
  method: "GET"
}).handler(getAuthToken_createServerFn_handler, async () => getCookie(COOKIE_NAME));
const getOtpChallenge_createServerFn_handler = createServerRpc({
  id: "988f932a00c333c6bb8e7100cd237c222e46cb103f32a16ff656c65e637f9308",
  name: "getOtpChallenge",
  filename: "lib/auth-server.ts"
}, (opts) => getOtpChallenge.__executeServer(opts));
const getOtpChallenge = createServerFn({
  method: "GET"
}).handler(getOtpChallenge_createServerFn_handler, async () => getCookie(COOKIE_OTP_CHALLENGE));
function setAuthToken(token) {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60
  });
}
function setOtpChallenge(challenge) {
  setCookie(COOKIE_OTP_CHALLENGE, challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });
}
const isAuthenticated_createServerFn_handler = createServerRpc({
  id: "a3fe213e5275d66396225ebc27bc3c6146678f5a2b3bd9e366a35a4c260ab1c1",
  name: "isAuthenticated",
  filename: "lib/auth-server.ts"
}, (opts) => isAuthenticated.__executeServer(opts));
const isAuthenticated = createServerFn({
  method: "GET"
}).handler(isAuthenticated_createServerFn_handler, async () => !!getCookie(COOKIE_NAME));
const login_createServerFn_handler = createServerRpc({
  id: "aceb4afc59163ecc33d059aa019da606105f8d4c88dc43f0d6b58389b410b7a8",
  name: "login",
  filename: "lib/auth-server.ts"
}, (opts) => login.__executeServer(opts));
const login = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(login_createServerFn_handler, async ({
  data
}) => {
  try {
    const salt = await getSalt(data.email);
    const hashedPassword = await hashPassword(data.password, salt);
    const client = createGraphQLClient();
    const variables = {
      input: {
        email: data.email,
        password: hashedPassword
      }
    };
    const response = await client.request(SIGN_IN_MUTATION, variables);
    const signInData = response.signIn;
    if (signInData.otpSessionChallenge) {
      setOtpChallenge(signInData.otpSessionChallenge);
      return {
        success: false,
        requiresTwoFactor: true
      };
    }
    if (signInData.errors?.length) {
      const has2faError = signInData.errors.some((e) => e.code === "2fa_missing" || e.message?.includes("2fa"));
      if (has2faError) {
        return {
          success: false,
          error: "Two-factor authentication is required."
        };
      }
      return {
        success: false,
        error: signInData.errors.map((e) => e.message).join(", ")
      };
    }
    if (signInData.jwtToken?.token && signInData.currentUser) {
      setAuthToken(signInData.jwtToken.token);
      return {
        success: true,
        user: {
          slug: signInData.currentUser.slug
        }
      };
    }
    return {
      success: false,
      error: "Unexpected response"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed"
    };
  }
});
const loginWithTwoFactor_createServerFn_handler = createServerRpc({
  id: "e7425d8a87ce7784e974ad7333aebdfd2a4903dbe9ee1ee190edb6420088c802",
  name: "loginWithTwoFactor",
  filename: "lib/auth-server.ts"
}, (opts) => loginWithTwoFactor.__executeServer(opts));
const loginWithTwoFactor = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(loginWithTwoFactor_createServerFn_handler, async ({
  data
}) => {
  try {
    const otpChallenge = getCookie(COOKIE_OTP_CHALLENGE);
    if (!otpChallenge) {
      return {
        success: false,
        error: "No 2FA challenge found."
      };
    }
    const client = createGraphQLClient();
    const variables = {
      input: {
        otpAttempt: data.otpCode,
        otpSessionChallenge: otpChallenge
      }
    };
    const response = await client.request(SIGN_IN_MUTATION, variables);
    const signInData = response.signIn;
    if (signInData.errors?.length) {
      return {
        success: false,
        error: signInData.errors.map((e) => e.message).join(", ")
      };
    }
    if (signInData.jwtToken?.token && signInData.currentUser) {
      setAuthToken(signInData.jwtToken.token);
      deleteCookie(COOKIE_OTP_CHALLENGE);
      return {
        success: true,
        user: {
          slug: signInData.currentUser.slug
        }
      };
    }
    return {
      success: false,
      error: "Unexpected response"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "2FA failed"
    };
  }
});
const logout_createServerFn_handler = createServerRpc({
  id: "ea03da1fb8c22df1fb3d0dbe331c56db03b76d0fffef9c546bfb779df08466ce",
  name: "logout",
  filename: "lib/auth-server.ts"
}, (opts) => logout.__executeServer(opts));
const logout = createServerFn({
  method: "POST"
}).handler(logout_createServerFn_handler, async () => {
  deleteCookie(COOKIE_NAME);
  deleteCookie(COOKIE_OTP_CHALLENGE);
});
export {
  getAuthToken_createServerFn_handler,
  getOtpChallenge_createServerFn_handler,
  isAuthenticated_createServerFn_handler,
  loginWithTwoFactor_createServerFn_handler,
  login_createServerFn_handler,
  logout_createServerFn_handler
};
