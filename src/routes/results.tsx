import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout/page-layout";
import { ResultsView } from "@/components/results/results-view";
import { isAuthenticated } from "@/lib/auth-server";

export const Route = createFileRoute("/results")({
  component: ResultsPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function ResultsPage() {
  return (
    <PageLayout containerSize="wide" showNav>
      <ResultsView />
    </PageLayout>
  );
}
