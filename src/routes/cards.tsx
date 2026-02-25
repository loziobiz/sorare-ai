import { createFileRoute, redirect } from "@tanstack/react-router";
import { CardsDashboard } from "@/components/cards-dashboard";
import { PageLayout } from "@/components/layout/page-layout";
import { isAuthenticated } from "@/lib/auth-server";

export const Route = createFileRoute("/cards")({
  component: CardsPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function CardsPage() {
  return (
    <PageLayout containerSize="default" showNav>
      <CardsDashboard />
    </PageLayout>
  );
}
