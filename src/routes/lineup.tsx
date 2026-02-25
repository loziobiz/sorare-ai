import { Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { LineupBuilder } from "@/components/lineup/lineup-builder";
import { isAuthenticated } from "@/lib/auth-server";

export const Route = createFileRoute("/lineup")({
  component: LineupPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function LineupPage() {
  return (
    <main className="min-h-screen from-slate-50 to-white p-4 md:p-4">
      <div className="mx-auto max-w-[1600px]">
        <Suspense
          fallback={
            <div className="flex h-[50vh] items-center justify-center">
              <p className="text-muted-foreground">Caricamento...</p>
            </div>
          }
        >
          <LineupBuilder />
        </Suspense>
      </div>
    </main>
  );
}
