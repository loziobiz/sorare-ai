import { useEffect } from "react";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration);

        // Controlla aggiornamenti
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // Nuovo SW disponibile, suggerisci refresh
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("SW registration failed:", error);
      });
  });
}

export function useServiceWorker() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
}

export async function unregisterServiceWorkers() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
}
