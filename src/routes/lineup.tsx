import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { PageLayout } from "@/components/layout/page-layout";
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
    <PageLayout containerSize="wide" showNav>
      <Suspense
        fallback={
          <div className="flex h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        }
      >
        <LineupBuilder />
      </Suspense>
    </PageLayout>
  );
}
