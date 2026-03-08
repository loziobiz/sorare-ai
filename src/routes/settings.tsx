import { createFileRoute, redirect } from "@tanstack/react-router";
import { LogOut, RefreshCw } from "lucide-react";
import { ExportTokenButton } from "@/components/export-token-button";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logout } from "@/lib/auth-server";
import { isAuthenticated } from "@/lib/auth-server";
import { clearUserEmail } from "@/lib/user-id";
import { useKvCards } from "@/hooks/use-kv-cards";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function SettingsPage() {
  const { isSyncing, isLoading, syncWithSorare } = useKvCards();
  const isDisabled = isSyncing || isLoading;

  const handleLogout = async () => {
    await logout();
    clearUserEmail();
    document.cookie = "sorare_jwt_token=; path=/; max-age=0";
    window.location.href = "/";
  };

  return (
    <PageLayout containerSize="default" showNav>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le impostazioni dell&apos;applicazione e gli strumenti CLI.
          </p>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="grid gap-6">
          {/* Logout Section */}
          <Card className="border-white/10 bg-[#1A1B23] text-slate-200">
            <CardHeader>
              <CardTitle>Sessione</CardTitle>
              <CardDescription className="text-slate-400">
                Gestisci la tua sessione attuale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={handleLogout}
                variant="outline"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>

          {/* Cards Sync Section */}
          <Card className="border-white/10 bg-[#1A1B23] text-slate-200">
            <CardHeader>
              <CardTitle>Sincronizzazione Carte</CardTitle>
              <CardDescription className="text-slate-400">
                Aggiorna manualmente i dati delle carte dalla API Sorare.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-400 text-sm">
                Le carte vengono automaticamente aggiornate due volte al giorno.
                Usa questo pulsante solo se noti incongruenze nei dati o se hai
                appena acquistato/venduto giocatori.
              </p>
              <Button
                className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                disabled={isDisabled}
                onClick={syncWithSorare}
                variant="outline"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                Aggiorna Carte
              </Button>
            </CardContent>
          </Card>

          {/* CLI Tools Section */}
          <Card className="border-white/10 bg-[#1A1B23] text-slate-200">
            <CardHeader>
              <CardTitle>Strumenti CLI</CardTitle>
              <CardDescription className="text-slate-400">
                Esporta il token JWT per utilizzare gli strumenti da riga di
                comando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="space-y-0.5">
                  <p className="font-medium">Token JWT</p>
                  <p className="text-slate-400 text-sm">
                    Copia il token per autenticare il CLI.
                  </p>
                </div>
                <ExportTokenButton />
              </div>

              <div className="rounded-md bg-white/5 p-4 text-sm">
                <p className="mb-2 font-medium">Istruzioni:</p>
                <ol className="list-inside list-decimal space-y-1 text-slate-400">
                  <li>Clicca il pulsante per copiare il token</li>
                  <li>
                    Apri il terminale nella cartella{" "}
                    <code className="rounded bg-white/10 px-1 text-slate-200">
                      cli/
                    </code>
                  </li>
                  <li>
                    Esegui:{" "}
                    <code className="rounded bg-white/10 px-1 text-slate-200">
                      pnpm import-token &lt;token&gt;
                    </code>
                  </li>
                  <li>Ora puoi usare i comandi CLI</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* API Information */}
          <Card className="border-white/10 bg-[#1A1B23] text-slate-200">
            <CardHeader>
              <CardTitle>Informazioni API</CardTitle>
              <CardDescription className="text-slate-400">
                Dettagli sull&apos;accesso alle API Sorare.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Endpoint GraphQL:</span>
                  <code className="text-slate-200 text-xs">
                    https://api.sorare.com/graphql
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Documentazione:</span>
                  <a
                    className="text-violet-400 hover:underline"
                    href="https://docs.sorare.com/api/introduction"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    docs.sorare.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </PageLayout>
  );
}
