# Architettura Dati

Questo documento descrive l'architettura di storage e il flusso dati dell'applicazione.

## Overview

L'applicazione utilizza un sistema di **cache distribuita** con Cloudflare KV come fonte primaria dei dati. Le chiamate all'API Sorare avvengono solo su esplicita richiesta dell'utente tramite il pulsante "Aggiorna carte".

## Flusso Dati

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Sorare API    │◄────┤   Bottone   │────►│  Cloudflare KV  │
│  (GraphQL)      │     │ "Aggiorna"  │     │ (sorare-mls-sync)
└─────────────────┘     └─────────────┘     └─────────────────┘
                                                    │
                                                    ▼
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Dashboard     │◄────│  useKvCards │◄────│  Worker API     │
│ Lineup Builder  │     │    Hook     │     │  (REST + Cache) │
│ Saved Lineups   │     └─────────────┘     └─────────────────┘
└─────────────────┘
```

## KV Store

Il KV Store è gestito dal worker Sorare sync (preferibilmente esposto su custom domain).

### Formato Chiavi Carte Utente

```
USR_{userId}:{clubCode}:{playerSlug}
```

Esempio: `USR_alessandro.bisi:SEA:andrew-thomas`

### Dati Salvati

Ogni carta nel KV contiene:

- **Dati base**: slug, name, rarityTyped, pictureUrl, anyPositions
- **Statistiche**: l5Average, l10Average, l15Average, l40Average
- **Power/XP**: power, powerBreakdown
- **Club**: clubName, clubCode, leagueName
- **Next Game**: Data prossima partita (dal playerData innestato)
- **Starter Odds**: Probabilità titolarità (dal playerData innestato)
- **Metadata**: savedAt, lastSyncedAt

### Player Data Innestato

Per i giocatori MLS, il worker recupera dati aggiuntivi dalla key `{clubCode}:{playerSlug}`:

```json
{
  "stats": {
    "odds": {
      "nextFixture": {
        "fixtureDate": "2026-03-08T01:30:00Z",
        "opponent": "St. Louis City SC",
        "opponentCode": "STL",
        "isHome": false,
        "startingOdds": { "starterOddsBasisPoints": 9000 },
        "teamWinOdds": { "winOddsBasisPoints": 4400, ... }
      }
    },
    "aaAnalysis": { "AA5": 6.12, "AA15": 6.91, ... }
  }
}
```

## Hook useKvCards

Tutti i componenti usano `useKvCards()` per leggere le carte:

```typescript
const { cards, isLoading, isRefreshing, syncWithSorare } = useKvCards();
```

- **cards**: Array di `UnifiedCard` con dati dal KV
- **isLoading**: Caricamento iniziale dal KV
- **isRefreshing**: Ricaricamento dati (dopo sync)
- **syncWithSorare**: Funzione per aggiornare da Sorare → KV

### UnifiedCard

Tipo unificato che combina dati carta e player:

```typescript
interface UnifiedCard {
  // Dati base carta
  slug, name, rarityTyped, anyPositions, pictureUrl
  // Averages
  l5Average, l10Average, l15Average, l40Average
  // Club
  clubSlug, clubName, clubCode, leagueName
  // Next Game (mappato da playerData)
  nextGame?: { date, homeTeam, awayTeam, ... }
  // Retrocompatibilità
  anyPlayer?: { activeClub, nextGame, nextClassicFixturePlayingStatusOdds }
}
```

## Aggiornamento Dati

L'aggiornamento avviene solo tramite il pulsante "Aggiorna carte":

1. **Fetch da Sorare**: `fetchAllCards()` chiama l'API GraphQL
2. **Trasformazione**: `transformCardToKvValue()` converte in formato KV
3. **Salvataggio**: `syncCardsToKv()` invia batch al worker
4. **Ricaricamento**: `fetchAllUserCards()` ricarica dal KV aggiornato

Nessun componente chiama Sorare direttamente durante la navigazione.

## User ID

L'user ID è estratto dalla email dell'utente (parte prima di `@`):

```typescript
// alessandro.bisi@gmail.com → alessandro.bisi
function extractUsernameFromEmail(email: string): string {
  const decoded = decodeURIComponent(email);
  return decoded.split("@")[0] ?? decoded;
}
```

L'email viene salvata in localStorage (`sorare_user_email`) al login.

## Caching

Il worker implementa caching HTTP per l'endpoint `/api/cards/with-players`:

- **TTL**: 24 ore
- **Invalidazione**: Automatica al salvataggio di nuove carte
- **Header**: `X-Cache-Status: HIT/MISS`

Il client usa `cache: "no-store"` per evitare caching del browser.

## Lineup Builder

### Filtro Leghe

Il filtro è semplificato a due opzioni:
- **Tutte le leghe**: Mostra tutte le carte
- **MLS**: Filtra per `leagueName === "MLS"`

### Game Modes

Modalità disponibili:
- `mls_arena_260`: MLS ARENA 260 (CAP 260)
- `mls_in_season`: MLS IN-SEASON (min 4 in-season)
- `gas_arena_260`: GAS ARENA 260 (CAP 260)
- `gas_arena_220`: GAS ARENA 220 (CAP 220)
- `gas_arena_nocap`: GAS ARENA NOCAP
- `gas_classic`: GAS CLASSIC (7 giocatori)

## Saved Lineups

### Raggruppamento

Le formazioni sono raggruppate per `gameMode` con intestazioni visibili:

```
MLS ARENA 260
  [Formazione A] [Formazione B]...

GAS ARENA 260
  [Formazione C] [Formazione D]...
```

### Ordinamento

All'interno di ogni gruppo, le formazioni sono ordinate per **data della prima partita** (la più vicina tra tutte le carte della formazione).

### Badge

Ogni formazione mostra:
- **Modalità**: Badge sotto il titolo (es. "MLS ARENA 260")
- **L10/CAP**: Badge con punti/cap per formazioni con cap (es. "245/260")

### Drag & Drop

- Le carte possono essere trascinate tra formazioni
- **Restrizione**: Lo slot Extra (EX/EXT) non accetta portieri
- **Compatibilità**: Controllo su L10 totale dopo lo scambio

## Configurazione

Le variabili d'ambiente necessarie:

```
VITE_SORARE_GRAPHQL_URL=https://api.sorare.com/graphql
VITE_KV_WORKER_URL=https://mls-sync.alebisi.it
KV_WORKER_URL=https://mls-sync.alebisi.it
```

## Note

- Il worker `sorare-mls-sync` è un progetto separato gestito in `cli/`
- I dati dei giocatori MLS nel KV vengono aggiornati tramite cron job sul worker
- Le carte salvate nel KV persistono finché non vengono esplicitamente eliminate
