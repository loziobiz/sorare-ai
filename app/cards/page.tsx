import { CardsDashboard } from "@/components/cards-dashboard";

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl">
        <CardsDashboard />
      </div>
    </main>
  );
}
