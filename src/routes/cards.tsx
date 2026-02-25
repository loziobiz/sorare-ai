import { createFileRoute, redirect } from "@tanstack/react-router";
import { CardsDashboard } from "@/components/cards-dashboard";
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
    <main className="min-h-screen from-slate-50 to-slate-100 p-4 md:p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl">
        <CardsDashboard />
      </div>
    </main>
  );
}
