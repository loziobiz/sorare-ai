# Implementazione Vista "Risultati"

## Contesto
Richiesta di creare una nuova vista "Risultati" per visualizzare le formazioni effettivamente schierate nel gioco Sorare, distinguendola dalle formazioni salvate per pianificazione.

## Query GraphQL

### Ottenere la lista delle Game Weeks
```graphql
query GetSo5Fixtures($sport: Sport!, $eventType: So5FixtureEvent!, $last: Int, $future: Boolean) {
  so5 {
    allSo5Fixtures(sport: $sport, eventType: $eventType, last: $last, future: $future) {
      nodes {
        slug
        gameWeek
        displayName
        startDate
        endDate
      }
    }
  }
}
```
**Parametri:** `sport: FOOTBALL`, `eventType: CLASSIC`, `last: 20`, `future: false`

### Ottenere i risultati di una GW specifica
```graphql
query GetSo5Results($slug: String!) {
  so5 {
    so5Fixture(slug: $slug, sport: FOOTBALL) {
      slug
      gameWeek
      displayName
      mySo5Lineups(draft: false) {
        id
        name
        so5Leaderboard {
          slug
          displayName
          division
        }
        so5Appearances {
          id
          captain
          score
          anyCard {
            slug
            name
            rarityTyped
            pictureUrl
          }
          anyPlayer {
            displayName
            slug
          }
        }
      }
      mySo5Rankings(first: 50) {
        ranking
        score
        eligibleForReward
      }
    }
  }
}
```

## Tipi TypeScript Aggiunti

```typescript
interface So5Appearance {
  id: string;
  captain: boolean;
  score: number;
  anyCard?: {
    slug: string;
    name: string;
    rarityTyped: string;
    pictureUrl?: string;
  };
  anyPlayer?: {
    displayName: string;
    slug: string;
  };
}

interface So5Lineup {
  id: string;
  name: string;
  so5Leaderboard: {
    slug: string;
    displayName: string;
    division: number;
  };
  so5Appearances: So5Appearance[];
}

interface So5Ranking {
  ranking: number;
  score: number;
  eligibleForReward: boolean;
}
```

## Struttura del Componente

### Layout
- **Header**: Titolo + dropdown selezione Game Week
- **Stats**: 3 card con numero formazioni, rankings e premi
- **Griglia formazioni**: Layout flex-wrap con gap-5 (stile saved-lineups)

### Card Giocatore (85px)
- Immagine carta (o placeholder con iniziale)
- Badge capitano (stellina ambra in alto a destra)
- **Punteggio**: sotto la carta, font 14px, con icona 📊 e colore in base al valore

### Header Formazione
- Nome formazione + badge torneo
- A destra: posizione ranking (#X), punteggio totale, icona trofeo se premio

### Ordinamento
Formazioni ordinate per `so5Leaderboard.slug` in ordine **decrescente** (Z-A).

## Route e Navigazione

### Nuova Route
File: `src/routes/results.tsx`
```typescript
export const Route = createFileRoute("/results")({
  component: ResultsPage,
  beforeLoad: async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) throw redirect({ to: "/" });
  },
});
```

### Navigazione
Aggiunto link "Risultati" in `components/site-nav.tsx` con icona Trophy.

## Stile
- Container: `space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm`
- Griglia: `flex flex-wrap items-start gap-5`
- Scroll orizzontale nascosto per le card giocatore
- Colori punteggio:
  - 0: slate
  - ≤30: rose
  - ≤40: orange
  - ≤59: lime
  - ≤79: emerald
  - >79: cyan

## Note
- Il campo `score` su `So5Lineup` non esiste nell'API, viene calcolato sommando i punteggi dei singoli giocatori
- Le fixture chiuse (passate) richiedono `future: false` nella query
- Una lineup può avere più rankings (partecipazione a più tornei)
- La vista non include la tabella "Classifiche" (rimossa su richiesta)
