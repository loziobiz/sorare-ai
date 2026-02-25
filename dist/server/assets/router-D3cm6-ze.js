import { createRootRoute, HeadContent, Outlet, Scripts, createFileRoute, redirect, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsxs, jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { i as isAuthenticated } from "./auth-server-BVOMZ7KW.js";
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
function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      console.log("SW registered:", registration);
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        }
      });
    }).catch((error) => {
      console.error("SW registration failed:", error);
    });
  });
}
function useServiceWorker() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
}
function SwRegistration() {
  useServiceWorker();
  return null;
}
const Route$4 = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sorare AI - Gestisci la tua collezione" },
      { name: "description", content: "Applicazione per interagire con Sorare API e gestire le tue carte collezionabili" },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Sorare AI" }
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" }
    ]
  }),
  component: RootComponent
});
function RootComponent() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { className: "antialiased", style: { fontFamily: "var(--font-geist-sans)" }, children: [
      /* @__PURE__ */ jsx(SwRegistration, {}),
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$3 = () => import("./saved-lineups-BxJzYAHH.js");
const Route$3 = createFileRoute("/saved-lineups")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component"),
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({
        to: "/"
      });
    }
  }
});
const $$splitComponentImporter$2 = () => import("./lineup-2V8GCSWM.js");
const Route$2 = createFileRoute("/lineup")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component"),
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({
        to: "/"
      });
    }
  }
});
const $$splitComponentImporter$1 = () => import("./cards-C_DGvUZB.js");
const Route$1 = createFileRoute("/cards")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component"),
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({
        to: "/"
      });
    }
  }
});
const $$splitComponentImporter = () => import("./index-Cp5XrIGQ.js");
const Route = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter, "component"),
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      throw redirect({
        to: "/cards"
      });
    }
  }
});
const SavedLineupsRoute = Route$3.update({
  id: "/saved-lineups",
  path: "/saved-lineups",
  getParentRoute: () => Route$4
});
const LineupRoute = Route$2.update({
  id: "/lineup",
  path: "/lineup",
  getParentRoute: () => Route$4
});
const CardsRoute = Route$1.update({
  id: "/cards",
  path: "/cards",
  getParentRoute: () => Route$4
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$4
});
const rootRouteChildren = {
  IndexRoute,
  CardsRoute,
  LineupRoute,
  SavedLineupsRoute
};
const routeTree = Route$4._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultStaleTime: 5e3,
    scrollRestoration: true
  });
}
export {
  getRouter
};
