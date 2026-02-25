import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { SwRegistration } from "@/components/sw-registration";
import "@/src/styles/globals.css";
import "@/src/styles/fonts.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sorare AI - Gestisci la tua collezione" },
      {
        name: "description",
        content:
          "Applicazione per interagire con Sorare API e gestire le tue carte collezionabili",
      },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "apple-mobile-web-app-title", content: "Sorare AI" },
    ],
    links: [{ rel: "manifest", href: "/manifest.json" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <SwRegistration />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
