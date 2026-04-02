import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout/page-layout";
import { StellarDashboard } from "@/components/stellar-nights/stellar-dashboard";
import { isAuthenticated } from "@/lib/auth-server";

export const Route = createFileRoute("/stellar-nights")({
  component: StellarNightsPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function StellarNightsPage() {
  return (
    <PageLayout containerSize="default" showNav>
      <StellarDashboard />
    </PageLayout>
  );
}
