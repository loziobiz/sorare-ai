import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CardsDashboard } from "@/components/cards-dashboard";

export default async function CardsPage() {
  // Verifica autenticazione server-side
  const cookieStore = await cookies();
  const token = cookieStore.get("sorare_jwt_token");

  if (!token) {
    redirect("/");
  }

  return (
    <main className="min-h-screen from-slate-50 to-slate-100 p-4 md:p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl">
        <CardsDashboard />
      </div>
    </main>
  );
}
