# Probabilità di Titolarità e Vittoria - Documentazione API Sorare

Questo documento descrive come recuperare i dati relativi a:
- **Probabilità di titolarità** (% di possibilità che un giocatore parta titolare)
- **Probabilità di vittoria** (% di possibilità che la squadra di un giocatore vinca la partita)

attraverso le API GraphQL di Sorare.

---

## Indice

1. [Concetti Fondamentali](#concetti-fondamentali)
2. [Probabilità di Titolarità (Starting Odds)](#probabilità-di-titolarità-starting-odds)
3. [Probabilità di Vittoria (Win Odds)](#probabilità-di-vittoria-win-odds)
4. [Esempi di Query](#esempi-di-query)
5. [Utilizzo nei Filtri](#utilizzo-nei-filtri)
6. [Note Importanti](#note-importanti)

---

## Concetti Fondamentali

### Basis Points

Tutte le probabilità nell'API Sorare sono espresse in **basis points** (punti base):
- `1 basis point = 0.01%`
- `100 basis points = 1%`
- `10000 basis points = 100%`

Per convertire da basis points a percentuale:
```typescript
const percentage = Math.round(basisPoints / 100); // es: 8750 -> 88%
```

### Fonte dei Dati

Le probabilità sono fornite da provider esterni specializzati (es: bookmakers, algoritmi di previsione). Ogni probabilità include:
- Il valore in basis points
- L'affidabilità della previsione (`reliability`)
- Le informazioni sul provider (`providerIconUrl`, `providerRedirectUrl`)

---

## Probabilità di Titolarità (Starting Odds)

### Tipo GraphQL: `PlayingStatusOdds`

```graphql
type PlayingStatusOdds {
  nonPlayingOddsBasisPoints: Int!
  providerIconUrl: String!
  providerRedirectUrl: String!
  reliability: OrdinalRatingEnum!
  starterOddsBasisPoints: Int!
  substituteOddsBasisPoints: Int!
}
```

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `starterOddsBasisPoints` | `Int!` | Probabilità che il giocatore parta titolare (0-10000) |
| `substituteOddsBasisPoints` | `Int!` | Probabilità che il giocatore entri dalla panchina |
| `nonPlayingOddsBasisPoints` | `Int!` | Probabilità che il giocatore non giichi |
| `reliability` | `OrdinalRatingEnum` | Affidabilità della previsione (A, B, C, D, E, F) |
| `providerIconUrl` | `String!` | URL dell'icona del provider |
| `providerRedirectUrl` | `String!` | URL di reindirizzamento al provider |

### Dove Accedere

La probabilità di titolarità è disponibile su:

1. **`Player.nextClassicFixturePlayingStatusOdds`** - Prossima partita classica
2. **`PlayerGameStats.footballPlayingStatusOdds`** - Partita specifica (richiede `newVersion: Boolean`)

---

## Probabilità di Vittoria (Win Odds)

### Tipo GraphQL: `FootballTeamGameStats`

```graphql
type FootballTeamGameStats implements TeamGameStatsInterface {
  # ... altri campi stats ...
  winOdds: Float @deprecated(reason: "Use win_odds_basis_points instead")
  winOddsBasisPoints: Int
  drawOddsBasisPoints: Int
  loseOddsBasisPoints: Int
  cleanSheetOdds: Float
  # ...
}
```

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `winOddsBasisPoints` | `Int` | Probabilità di vittoria della squadra (0-10000) |
| `drawOddsBasisPoints` | `Int` | Probabilità di pareggio |
| `loseOddsBasisPoints` | `Int` | Probabilità di sconfitta |
| `cleanSheetOdds` | `Float` | Probabilità di non subire gol |
| `winOdds` | `Float` | **DEPRECATO** - Usare `winOddsBasisPoints` |

### Dove Accedere

Le probabilità di vittoria sono disponibili su:

1. **`Game.homeStats`** / **`Game.awayStats`** - Statistiche della partita
   ```graphql
   homeStats {
     ... on FootballTeamGameStats {
       winOddsBasisPoints
       drawOddsBasisPoints
       loseOddsBasisPoints
     }
   }
   ```

---

## Esempi di Query

### Esempio 1: Probabilità di Titolarità per un Giocatore

```graphql
query GetPlayerStartingOdds($slug: String!) {
  player(slug: $slug) {
    displayName
    slug
    nextClassicFixturePlayingStatusOdds {
      starterOddsBasisPoints
      substituteOddsBasisPoints
      nonPlayingOddsBasisPoints
      reliability
      providerIconUrl
    }
    nextGame(so5FixtureEligible: true) {
      date
      homeTeam { name }
      awayTeam { name }
    }
  }
}
```

**Variabili:**
```json
{
  "slug": "victor-osimhen-1998-12-29"
}
```

**Risposta:**
```json
{
  "data": {
    "player": {
      "displayName": "Victor Osimhen",
      "slug": "victor-osimhen-1998-12-29",
      "nextClassicFixturePlayingStatusOdds": {
        "starterOddsBasisPoints": 8750,
        "substituteOddsBasisPoints": 1000,
        "nonPlayingOddsBasisPoints": 250,
        "reliability": "A",
        "providerIconUrl": "https://provider.example.com/icon.png"
      },
      "nextGame": {
        "date": "2026-03-03T19:45:00Z",
        "homeTeam": { "name": "Napoli" },
        "awayTeam": { "name": "Juventus" }
      }
    }
  }
}
```

### Esempio 2: Probabilità di Vittoria della Squadra

```graphql
query GetTeamWinOdds($slug: String!) {
  player(slug: $slug) {
    displayName
    slug
    nextGame(so5FixtureEligible: true) {
      date
      homeTeam { 
        name 
        code
      }
      awayTeam { 
        name 
        code
      }
      homeStats {
        ... on FootballTeamGameStats {
          winOddsBasisPoints
          drawOddsBasisPoints
          loseOddsBasisPoints
        }
      }
      awayStats {
        ... on FootballTeamGameStats {
          winOddsBasisPoints
          drawOddsBasisPoints
          loseOddsBasisPoints
        }
      }
    }
  }
}
```

**Risposta:**
```json
{
  "data": {
    "player": {
      "displayName": "Victor Osimhen",
      "slug": "victor-osimhen-1998-12-29",
      "nextGame": {
        "date": "2026-03-03T19:45:00Z",
        "homeTeam": { "name": "Napoli", "code": "NAP" },
        "awayTeam": { "name": "Juventus", "code": "JUV" },
        "homeStats": {
          "winOddsBasisPoints": 4200,
          "drawOddsBasisPoints": 2800,
          "loseOddsBasisPoints": 3000
        },
        "awayStats": {
          "winOddsBasisPoints": 3000,
          "drawOddsBasisPoints": 2800,
          "loseOddsBasisPoints": 4200
        }
      }
    }
  }
}
```

### Esempio 3: Query Completa per Carte con Probabilità

```graphql
query GetCardsWithProbabilities($slugs: [String!]!) {
  cards(slugs: $slugs) {
    slug
    name
    anyPlayer {
      ... on Player {
        displayName
        slug
        nextClassicFixturePlayingStatusOdds {
          starterOddsBasisPoints
          substituteOddsBasisPoints
          nonPlayingOddsBasisPoints
          reliability
          providerIconUrl
          providerRedirectUrl
        }
        nextGame(so5FixtureEligible: true) {
          date
          homeTeam { 
            name 
            code
          }
          awayTeam { 
            name 
            code
          }
          homeStats {
            ... on FootballTeamGameStats {
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
          awayStats {
            ... on FootballTeamGameStats {
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
        }
      }
    }
  }
}
```

---

## Utilizzo nei Filtri

### Filtrare per Probabilità di Titolarità

Nelle query che supportano filtri (es: `myFilteredBench`, `playerRecommendations`), è possibile filtrare per range di probabilità:

```graphql
query GetFilteredBench($so5FixtureSlug: String!) {
  currentUser {
    footballProfile {
      myFilteredBench(
        so5FixtureSlug: $so5FixtureSlug
        starterOddsBasisPointsRange: {
          min: 7000   # 70%
          max: 10000  # 100%
        }
      ) {
        nodes {
          id
          anyPlayer {
            displayName
          }
        }
      }
    }
  }
}
```

### RangeInput

```graphql
input RangeInput {
  min: Int
  max: Int
}
```

---

## Note Importanti

### Disponibilità dei Dati

1. **Probabilità di Titolarità**: 
   - Disponibile solo per partite future
   - Generalmente aggiornata nelle ore precedenti alla partita
   - Può essere `null` se non ci sono dati disponibili

2. **Probabilità di Vittoria**:
   - Disponibile su `FootballTeamGameStats`
   - Richiede l'uso di un **inline fragment** (`... on FootballTeamGameStats`) perché `homeStats`/`awayStats` restituiscono l'interfaccia `TeamGameStatsInterface`

### Affidabilità delle Previsioni

Il campo `reliability` indica l'affidabilità della previsione:
- `A` = Affidabilità massima
- `B` = Buona affidabilità
- `C` = Affidabilità media
- `D` = Affidabilità limitata
- `E` / `F` = Affidabilità bassa

### TypeScript Types

```typescript
// PlayingStatusOdds
interface PlayingStatusOdds {
  starterOddsBasisPoints: number;
  substituteOddsBasisPoints: number;
  nonPlayingOddsBasisPoints: number;
  reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  providerIconUrl: string;
  providerRedirectUrl: string;
}

// FootballTeamGameStats
interface FootballTeamGameStats {
  winOddsBasisPoints?: number | null;
  drawOddsBasisPoints?: number | null;
  loseOddsBasisPoints?: number | null;
  cleanSheetOdds?: number | null;
}

// Conversione helper
function basisPointsToPercentage(basisPoints: number): number {
  return Math.round(basisPoints / 100);
}

function getStarterOddsColor(percentage: number): string {
  if (percentage < 50) return 'red';
  if (percentage <= 70) return 'yellow';
  return 'green';
}
```

### Dipendenze nel Progetto

Esempio di utilizzo nel codice del progetto:

```typescript
// components/lineup/pitch-slot.tsx
const starterOdds = Math.round(
  card.anyPlayer.nextClassicFixturePlayingStatusOdds
    .starterOddsBasisPoints / 100
);

// Determina il colore in base alla percentuale
if (starterOdds < 50) {
  return 'text-red-500';
} else if (starterOdds <= 70) {
  return 'text-yellow-500';
} else {
  return 'text-green-500';
}
```

---

## Riferimenti

- [Sorare API How-to](/Users/alessandrobisi/Progetti/sorare-ai/docs/sorare_api.md)
- [Sorare GraphQL Schema](/Users/alessandrobisi/Progetti/sorare-ai/docs/schema.basic.graphql)
- [Sorare Scoring Rules](/Users/alessandrobisi/Progetti/sorare-ai/docs/sorare_scoring_rules.md)
