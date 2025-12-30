import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SavedLineups } from "@/components/saved-lineups/saved-lineups";

export default async function SavedLineupsPage() {
  // Verifica autenticazione server-side
  const cookieStore = await cookies();
  const token = cookieStore.get("sorare_jwt_token");

  if (!token) {
    redirect("/");
  }

  return <SavedLineups />;
}
