import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LineupBuilder } from "@/components/lineup/lineup-builder";

export default async function LineupPage() {
  // Verifica autenticazione server-side
  const cookieStore = await cookies();
  const token = cookieStore.get("sorare_jwt_token");

  if (!token) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
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
