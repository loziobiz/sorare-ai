import { createFileRoute, redirect } from "@tanstack/react-router";
import { SavedLineups } from "@/components/saved-lineups/saved-lineups";
import { isAuthenticated } from "@/lib/auth-server";

export const Route = createFileRoute("/saved-lineups")({
  component: SavedLineupsPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function SavedLineupsPage() {
  return <SavedLineups />;
}
