# Migrazione Next.js → TanStack Start - Checklist

## ✅ Completato

### Fase 1: Bootstrap TanStack Start
- [x] Installazione dipendenze TanStack Start
- [x] Configurazione Vite (`vite.config.ts`)
- [x] Creazione struttura `src/`
- [x] Configurazione router (`src/router.tsx`)
- [x] Root route (`src/routes/__root.tsx`)

### Fase 2: Layout, Metadata, Font e CSS
- [x] Migrazione `globals.css`
- [x] Creazione `src/styles/fonts.css` (Google Fonts)
- [x] Meta tags e manifest PWA
- [x] Integrazione `SwRegistration`

### Fase 3: Routing Pagine
- [x] `/` → `src/routes/index.tsx`
- [x] `/cards` → `src/routes/cards.tsx`
- [x] `/lineup` → `src/routes/lineup.tsx`
- [x] `/saved-lineups` → `src/routes/saved-lineups.tsx`
- [x] Protezione route con `beforeLoad`

### Fase 4: Autenticazione
- [x] Creazione `lib/auth-server.ts` con server functions
- [x] `login()` - Login con email/password
- [x] `loginWithTwoFactor()` - Login con 2FA
- [x] `logout()` - Logout
- [x] `isAuthenticated()` - Verifica auth
- [x] `getAuthToken()` - Recupero token
- [x] Gestione cookie HTTP-only

### Fase 5: API Routes → Server Functions
- [x] `/api/graphql` → `graphqlProxy()` server function
- [x] `/api/test-price` → `testPrice()` server function
- [x] `/api/test-range` → `testRange()` server function
- [x] Aggiornamento `lib/sorare-api.ts`

### Fase 6: Componenti Client
- [x] `SiteNav` - Aggiornato a TanStack Router Link
- [x] `LineupBuilder` - Aggiornato useRouter/useSearch
- [x] `DashboardHeader` - Aggiornato useRouter
- [x] `SavedLineups` - Aggiornato useRouter, img invece di next/image
- [x] `SorareCard`/`CardImage` - img invece di next/image
- [x] `CardThumbnail` - img invece di next/image
- [x] `PitchSlot` - img invece di next/image
- [x] `LoginForm` - Aggiornato a server function
- [x] `TwoFactorAuthForm` - Aggiornato a server function

### Fase 7: PWA e Static Assets
- [x] Mantenuto `public/sw.js`
- [x] Mantenuto `public/manifest.json`
- [x] Configurazione headers per `sw.js`

### Fase 8: Build e Deploy
- [x] Aggiornamento `wrangler.jsonc`
- [x] Script npm per deploy
- [x] Build di test completato con successo

## 🔄 Cutover Finale (da eseguire)

### Pre-cutover
- [ ] Test end-to-end completi:
  - [ ] Login + 2FA + logout
  - [ ] Redirect route protette
  - [ ] Caricamento carte, refresh, clear cache
  - [ ] Salvataggio/modifica/eliminazione formazioni
  - [ ] Endpoint API (testare le server functions)
  - [ ] Registrazione SW e comportamento offline
- [ ] Test regressione UI (navigazione, query params)
- [ ] Verifica PWA (manifest, icons, sw.js)

### Cutover
- [ ] Rimuovi directory `app/` (Next.js legacy)
- [ ] Rimuovi `middleware.ts`
- [ ] Rimuovi `next.config.ts`
- [ ] Rimuovi `open-next.config.ts`
- [ ] Rimuovi dipendenza `next` da `package.json`
- [ ] Rimuovi dipendenze OpenNext da `package.json`
- [ ] Aggiorna script npm:
  - [ ] `dev` → `vite dev --port 3000`
  - [ ] `build` → `vite build`
  - [ ] `preview` → `wrangler dev`
  - [ ] `deploy` → `wrangler deploy`
- [ ] Rimuovi script legacy

### Post-cutover
- [ ] Deploy su Cloudflare Workers
- [ ] Verifica funzionamento in produzione
- [ ] Monitoraggio errori
- [ ] Aggiornamento documentazione

## 🚨 Rollback Plan

Se necessario, il rollback può essere effettuato ripristinando il branch precedente con Next.js:

```bash
git checkout <branch-nextjs-legacy>
```

## 📊 Metriche di Successo

- [ ] Build TanStack Start completato senza errori
- [ ] Deploy Cloudflare Workers riuscito
- [ ] Tutte le funzionalità operative in produzione
- [ ] Performance comparabili o migliori rispetto a Next.js
- [ ] Zero regressioni critiche

## 📝 Note

- La migrazione mantiene la parità funzionale con Next.js
- I cookie auth sono compatibili (stessi nomi e policy)
- La struttura componenti è preservata
- I dati IndexedDB sono preservati
