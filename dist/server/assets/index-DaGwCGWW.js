import { jsx, jsxs } from "react/jsx-runtime";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { d as cn, A as Alert, b as AlertDescription, B as Button } from "./button-C7-Yro-a.js";
import { C as Card, b as CardHeader, c as CardTitle, d as CardDescription, a as CardContent, I as Input } from "./input-DXlO4Tx1.js";
import * as LabelPrimitive from "@radix-ui/react-label";
import { a as login, b as loginWithTwoFactor } from "./auth-server-BVOMZ7KW.js";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "../server.js";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "@tanstack/react-router/ssr/server";
function Label({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    LabelPrimitive.Root,
    {
      className: cn(
        "flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className
      ),
      "data-slot": "label",
      ...props
    }
  );
}
function LoginForm({ onSuccess, onTwoFactorRequired }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await login({ data: { email, password } });
      if (result.success) {
        onSuccess?.();
      } else if (result.requiresTwoFactor) {
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
  return /* @__PURE__ */ jsxs(Card, { className: "mx-auto w-full max-w-md", children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "Accedi" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Inserisci le tue credenziali Sorare per accedere" })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { className: "space-y-4", onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            disabled: isLoading,
            id: "email",
            onChange: (e) => setEmail(e.target.value),
            placeholder: "nome@esempio.com",
            required: true,
            type: "email",
            value: email
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            disabled: isLoading,
            id: "password",
            onChange: (e) => setPassword(e.target.value),
            required: true,
            type: "password",
            value: password
          }
        )
      ] }),
      error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
      /* @__PURE__ */ jsxs(Button, { className: "w-full", disabled: isLoading, type: "submit", children: [
        isLoading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Accedi"
      ] })
    ] }) })
  ] });
}
function TwoFactorAuthForm({
  onSuccess,
  onBack
}) {
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
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
  return /* @__PURE__ */ jsxs(Card, { className: "mx-auto w-full max-w-md", children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Shield, { className: "h-5 w-5" }),
        "Autenticazione a Due Fattori"
      ] }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Inserisci il codice dal tuo autenticatore per completare l'accesso" })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { className: "space-y-4", onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "otp", children: "Codice di verifica" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            autoComplete: "one-time-code",
            disabled: isLoading,
            id: "otp",
            maxLength: 6,
            onChange: (e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)),
            pattern: "[0-9]{6}",
            placeholder: "000000",
            required: true,
            type: "text",
            value: otpCode
          }
        )
      ] }),
      error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
      /* @__PURE__ */ jsxs(Button, { className: "w-full", disabled: isLoading, type: "submit", children: [
        isLoading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Verifica"
      ] }),
      onBack && /* @__PURE__ */ jsx(
        Button,
        {
          className: "w-full",
          disabled: isLoading,
          onClick: onBack,
          type: "button",
          variant: "outline",
          children: "Torna al login"
        }
      )
    ] }) })
  ] });
}
function Home() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState("login");
  const [, setError] = useState("");
  const handleLoginSuccess = () => {
    router.navigate({
      to: "/cards"
    });
  };
  const handleTwoFactorRequired = () => {
    setAuthStep("two-factor");
  };
  const handleTwoFactorSuccess = () => {
    router.navigate({
      to: "/cards"
    });
  };
  const handleBackToLogin = () => {
    setAuthStep("login");
  };
  return /* @__PURE__ */ jsx("main", { className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md space-y-6", children: [
    /* @__PURE__ */ jsx("div", { className: "space-y-2 text-center", children: /* @__PURE__ */ jsx("h1", { className: "font-bold text-4xl tracking-tight", children: "Sorare AI" }) }),
    authStep === "login" ? /* @__PURE__ */ jsx(LoginForm, { onSuccess: handleLoginSuccess, onTwoFactorRequired: handleTwoFactorRequired }) : /* @__PURE__ */ jsx(TwoFactorAuthForm, { onBack: handleBackToLogin, onSuccess: handleTwoFactorSuccess })
  ] }) });
}
export {
  Home as component
};
