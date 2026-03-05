import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout/page-layout";
import { ExportTokenButton } from "@/components/export-token-button";
import { isAuthenticated } from "@/lib/auth-server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
          {/* CLI Tools Section */}
          <Card>
            <CardHeader>
              <CardTitle>Strumenti CLI</CardTitle>
              <CardDescription>
                Esporta il token JWT per utilizzare gli strumenti da riga di comando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <p className="font-medium">Token JWT</p>
                  <p className="text-muted-foreground text-sm">
                    Copia il token per autenticare il CLI.
                  </p>
                </div>
                <ExportTokenButton />
              </div>

              <div className="rounded-md bg-slate-50 p-4 text-sm">
                <p className="font-medium mb-2">Istruzioni:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Clicca il pulsante per copiare il token</li>
                  <li>Apri il terminale nella cartella <code className="bg-slate-200 px-1 rounded">cli/</code></li>
                  <li>Esegui: <code className="bg-slate-200 px-1 rounded">pnpm import-token &lt;token&gt;</code></li>
                  <li>Ora puoi usare i comandi CLI</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* API Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni API</CardTitle>
              <CardDescription>
                Dettagli sull&apos;accesso alle API Sorare.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endpoint GraphQL:</span>
                  <code className="text-xs">https://api.sorare.com/graphql</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documentazione:</span>
                  <a 
                    href="https://docs.sorare.com/api/introduction" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
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
