# Sorare AI Dashboard

Applicazione per interagire con Sorare API e gestire le tue carte collezionabili. Costruita con **TanStack Start** e deployata su **Cloudflare Workers**.

## 🚀 Tecnologie

- **[TanStack Start](https://tanstack.com/start)** - Full-stack React framework
- **[TanStack Router](https://tanstack.com/router)** - Type-safe routing
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Edge deployment
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

## 🛠️ Scripts disponibili

### Sviluppo

```bash
# Avvia il server di sviluppo TanStack Start
npm run dev:start

# Build di produzione
npm run build:start

# Preview in locale
npm run preview:start
```

### Deploy

```bash
# Deploy su Cloudflare Workers
npm run deploy:start
```

### Legacy (Next.js - da rimuovere)

```bash
# Comandi Next.js (legacy, da rimuovere dopo il cutover)
npm run dev      # Dev server Next.js
npm run build    # Build Next.js
npm run preview  # Preview OpenNext Cloudflare
npm run deploy   # Deploy OpenNext Cloudflare
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
└── vite.config.ts          # Vite configuration
```

## 🔐 Autenticazione

L'autenticazione è gestita tramite **server functions** di TanStack Start con cookie HTTP-only:

- `sorare_jwt_token` - Token JWT per l'accesso alle API Sorare
- `sorare_otp_challenge` - Challenge per 2FA

## 🌐 Deploy

Il deploy avviene su **Cloudflare Workers** utilizzando Wrangler:

1. Configura le tue credenziali Cloudflare
2. Esegui `npm run deploy:start`

La configurazione è in `wrangler.jsonc`.

## 📝 Note sulla migrazione

Questo progetto è stato migrato da **Next.js 15** a **TanStack Start** per:

- Migliore supporto per Cloudflare Workers
- Type-safe routing integrato
- Server functions più semplici delle Server Actions
- Esperienza di sviluppo migliorata con Vite

## 🧪 Test

Esegui il check dei tipi TypeScript:

```bash
npx tsc --noEmit
```

Esegui linting e formattazione:

```bash
npm exec -- ultracite check
npm exec -- ultracite fix
```

## 📄 Licenza

MIT
