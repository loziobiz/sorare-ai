# Sorare AI Dashboard

Applicazione per interagire con Sorare API e gestire le tue carte collezionabili. Costruita con **TanStack Start** e deployata su **Cloudflare Workers**.

## 🚀 Tecnologie

- **[TanStack Start](https://tanstack.com/start)** - Full-stack React framework
- **[TanStack Router](https://tanstack.com/router)** - Type-safe routing
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Edge deployment
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[pnpm](https://pnpm.io/)** - Package manager

## 🛠️ Scripts disponibili

### Sviluppo

```bash
# Avvia il server di sviluppo TanStack Start
pnpm dev:start

# Build di produzione
pnpm build:start

# Preview in locale
pnpm preview:start
```

### Deploy

```bash
# Deploy su Cloudflare Workers
pnpm deploy:start
```

### Legacy (Next.js - da rimuovere)

```bash
# Comandi Vite (legacy, da rimuovere dopo il cutover)
pnpm dev      # Dev server Vite
pnpm build    # Build Vite
pnpm preview  # Preview OpenNext Cloudflare
pnpm deploy   # Deploy OpenNext Cloudflare
```

## 📁 Struttura del progetto

```
.
├── src/                      # Nuova app TanStack Start
│   ├── routes/              # Route definitions
│   │   ├── __root.tsx       # Root layout
│   │   ├── index.tsx        # Login page
│   │   ├── cards.tsx        # Dashboard carte
│   │   ├── lineup.tsx       # Lineup builder
│   │   └── saved-lineups.tsx # Formazioni salvate
│   ├── router.tsx           # Router configuration
│   ├── routeTree.gen.ts     # Generated route tree
│   └── styles/              # Additional styles
├── app/                     # Legacy Next.js (da rimuovere)
├── components/              # React components
├── lib/                     # Utilities e server functions
│   ├── auth-server.ts      # Auth server functions
│   ├── api-server.ts       # API server functions
│   └── ...
├── public/                  # Static assets
├── dist/                    # Build output
├── cli/                    # CF Backend Subproject (ignore it!)
└── vite.config.ts          # Vite configuration
```

## 🔐 Autenticazione

L'autenticazione è gestita tramite **server functions** di TanStack Start con cookie HTTP-only:

- `sorare_jwt_token` - Token JWT per l'accesso alle API Sorare
- `sorare_otp_challenge` - Challenge per 2FA

## 🌐 Deploy

Il deploy avviene su **Cloudflare Workers** utilizzando Wrangler:

### Autenticazione

L'autenticazione con Cloudflare avviene tramite **API Token** (configurato in `.dev.vars`):

```bash
# .dev.vars
CLOUDFLARE_API_TOKEN=tWfjNI43sJ4Xa_R7sbYVhYtf8UoGuoQ42Zg6Xcnd
```

Per generare un nuovo token:
1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Crea un token con i permessi:
   - `Zone:Read`
   - `Cloudflare Pages:Edit`
   - `Account:Read`
   - `Workers Scripts:Edit`

### Deploy

```bash
# Deploy su Cloudflare Workers (usa automaticamente il token da .dev.vars)
pnpm wrangler deploy

# Oppure esporta manualmente il token e usa il comando standard
export CLOUDFLARE_API_TOKEN=$(grep CLOUDFLARE_API_TOKEN .dev.vars | cut -d= -f2)
pnpm deploy
```

La configurazione è in `wrangler.jsonc`.

## 📊 Architettura Dati

L'applicazione utilizza **Cloudflare KV** come storage primario. Le carte vengono scaricate dall'API Sorare solo tramite il pulsante "Aggiorna carte", poi salvate nel KV e lette da tutte le viste.

📖 [Documentazione completa](./docs/architecture.md)

### Flusso principale

1. **Login** → Salva JWT token (cookie) e email (localStorage)
2. **Aggiorna carte** → Scarica da Sorare → Salva su KV
3. **Dashboard/Lineup** → Legge sempre dal KV (veloce, no rate limit)

### Funzionalità

- **Dashboard**: Visualizzazione carte con statistiche e next game
- **Lineup Builder**: Creazione formazioni con filtri avanzati
- **Saved Lineups**: Gestione formazioni salvate con drag & drop

## 📝 Note sulla migrazione

Questo progetto è stato migrato da **Next.js 15** a **TanStack Start** per:

- Migliore supporto per Cloudflare Workers
- Type-safe routing integrato
- Server functions più semplici delle Server Actions
- Esperienza di sviluppo migliorata con Vite

## 🧪 Test

Esegui il check dei tipi TypeScript:

```bash
pnpm typecheck
```

Esegui linting e formattazione:

```bash
pnpm check
pnpm format
```

## 📄 Licenza

MIT
