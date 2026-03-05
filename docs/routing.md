# Routing - TanStack Router (File-Based)

  Questo progetto usa il **file-based routing** di TanStack Router. Le route sono definit
  e automaticamente dai file in `src/routes/`.

  ## 📁 Struttura file

  src/routes/ ├── __root.tsx          # Root layout (HTML, meta, scripts) ├── index.tsx
          # Home page (/) ├── cards.tsx           # /cards ├── lineup.tsx          # /lin
  eup ├── saved-lineups.tsx   # /saved-lineups ├── results.tsx         # /results └── set
  tings.tsx        # /settings


  ## 📝 Creare una nuova route

  1. **Crea il file** in `src/routes/nome-route.tsx`:

  ```tsx
  import { createFileRoute, redirect } from "@tanstack/react-router";
  import { PageLayout } from "@/components/layout/page-layout";
  import { isAuthenticated } from "@/lib/auth-server";

  export const Route = createFileRoute("/nome-route")({
    component: NomeRoutePage,
    beforeLoad: async () => {
      // Protezione autenticazione (opzionale)
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        throw redirect({ to: "/" });
      }
    },
  });

  function NomeRoutePage() {
    return (
      <PageLayout containerSize="wide" showNav>
        <IlTuoComponente />
      </PageLayout>
    );
  }

  2. Aggiungi alla navigazione in components/site-nav.tsx:

  const navItems: NavItem[] = [
    { href: "/cards", label: "Le mie Carte", icon: CreditCard },
    { href: "/nome-route", label: "Nome Route", icon: IconName },
    // ...
  ];

  🧭 Navigazione programmatica

  import { useRouter } from "@tanstack/react-router";

  const router = useRouter();
  router.navigate({ to: "/results" });

  🔒 Autenticazione

  Il check auth si fa nel beforeLoad:

  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw redirect({ to: "/" });
    }
  }

  🎨 Layout

  Usa sempre PageLayout per consistenza:

   Prop            Valori                      Default
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   containerSize   "default", "wide", "full"   "default"
   showNav         true, false                 true
   shellVariant    "default", "wide", "auth"   "default"

  🔄 Link

  Usa il componente Link di TanStack Router:

  import { Link } from "@tanstack/react-router";

  <Link to="/results">Vai a Risultati</Link>

  ⚠️ Note importanti

  • Non serve registrare manualmente le route - il file router è auto-generato
  • Il nome del file determina il path (/results.tsx = /results)
  • __root.tsx è il layout radice (non modificare a meno che non serva cambiare HTML/meta
  • Usa useLocation() per leggere il path corrente (utile per active state nella nav)