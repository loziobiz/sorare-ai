# MLS Player Sync API Documentation

API per la gestione dei dati giocatori MLS e delle carte utente Sorare.

**Base URL:** `https://sorare-mls-sync.loziobiz.workers.dev`

---

## User Cards API

Gestione delle carte possedute dagli utenti. Ogni carta è salvata in Cloudflare KV con formato chiave:
```
USR_{USER_ID}:{CLUB_CODE}:{PLAYER_SLUG}
```

### Riepilogo Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/cards` | POST | Salva singola carta |
| `/api/cards/batch` | POST | Salva batch (max 500) |
| `/api/cards/single?key=xxx` | GET | Recupera singola carta per key |
| `/api/cards?userId=xxx` | GET | Lista carte |
| `/api/cards/with-players?userId=xxx` | GET | Lista carte + dati giocatore |
| `/api/cards/count?userId=xxx` | GET | Conta carte |
| `/api/cache/invalidate?userId=xxx` | POST | Invalida cache utente |
| `/api/cards/{key}` | DELETE | Elimina carta |

### Dettaglio Endpoints

#### 1. Salva singola carta

**POST** `/api/cards`

Salva una singola carta utente nel KV store.

**Request Body:**
```json
{
  "userId": "string",        // Identificativo utente (richiesto)
  "clubCode": "string",      // Codice club 3 lettere, es: "ATL" (richiesto)
  "playerSlug": "string",    // Slug giocatore Sorare (richiesto)
  "cardData": {              // Dati aggiuntivi della carta (opzionale)
    "rarity": "limited|rare|super_rare|unique",
    "serialNumber": 42,
    "purchasePrice": 0.05,
    "purchasedAt": "2024-03-01T10:00:00Z",
    "power": 75
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "key": "USR_user123:ATL:adrian-simon-gill"
}
```

**Response Error (400/500):**
```json
{
  "success": false,
  "key": "USR_user123:ATL:adrian-simon-gill",
  "error": "error message"
}
```

**Esempio cURL:**
```bash
curl -X POST https://sorare-mls-sync.loziobiz.workers.dev/api/cards \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "clubCode": "ATL",
    "playerSlug": "adrian-simon-gill",
    "cardData": {
      "rarity": "limited",
      "serialNumber": 42,
      "purchasePrice": 0.05
    }
  }'
```

---

#### 2. Salva batch di carte

**POST** `/api/cards/batch`

Salva multiple carte in un'unica chiamata. Utile per importare collezioni di centinaia di carte.

**Request Body:**
```json
{
  "cards": [
    {
      "userId": "string",
      "clubCode": "string",
      "playerSlug": "string",
      "cardData": { ... }
    },
    ...
  ]
}
```

**Limiti:**
- Massimo **500 carte** per richiesta
- Delay di 10ms tra ogni operazione (per rispettare rate limit KV)

**Response Success (200):**
```json
{
  "success": true,
  "summary": {
    "total": 5,
    "success": 5,
    "errors": 0
  },
  "results": [
    { "success": true, "key": "USR_user123:MIA:lionel-messi" },
    { "success": true, "key": "USR_user123:LAFC:denis-bouanga" }
  ]
}
```

**Esempio cURL:**
```bash
curl -X POST https://sorare-mls-sync.loziobiz.workers.dev/api/cards/batch \
  -H "Content-Type: application/json" \
  -d '{
    "cards": [
      {
        "userId": "user123",
        "clubCode": "MIA",
        "playerSlug": "lionel-messi",
        "cardData": { "rarity": "super_rare", "serialNumber": 7 }
      },
      {
        "userId": "user123",
        "clubCode": "LAFC",
        "playerSlug": "denis-bouanga",
        "cardData": { "rarity": "rare", "serialNumber": 123 }
      }
    ]
  }'
```

---

#### 3. Recupera singola carta

**GET** `/api/cards/single?key={key}`

Recupera una singola carta tramite la sua chiave KV completa, con dati giocatore innestati.

**Nota sui playerSlug**: Se il `playerSlug` nella carta non corrisponde a quello nel database (es. `andrew-thomas` vs `andrew-thomas-1998-09-01`), il sistema tenta automaticamente di estrarre lo slug corretto dallo slug completo della carta (formato: `{player-slug}-{anno}-{rarity}-{serial}`).

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `key` | string | Sì | Key KV completa della carta (es: `USR_user123:ATL:adrian-simon-gill`) |

**Response Success (200):**
```json
{
  "success": true,
  "card": {
    "key": "USR_user123:SEA:nicolas-dubersarsky",
    "value": {
      "rarity": "limited",
      "serialNumber": 42,
      "userId": "user123",
      "clubCode": "SEA",
      "playerSlug": "nicolas-dubersarsky",
      "slug": "nicolas-dubersarsky-2025-limited-42",
      "leagueName": "Major League Soccer",
      "so5Scores": [
        {
          "score": 72.5,
          "projectedScore": 75.0,
          "scoreStatus": "SCORED"
        }
      ],
      "savedAt": "2026-03-05T15:44:09.357Z"
    },
    "playerData": {
      "slug": "nicolas-dubersarsky",
      "name": "Nicolás Dubersarsky",
      "clubCode": "SEA",
      "position": "Midfielder",
      "stats": {
        "aaAnalysis": {
          "calculatedAt": "2026-03-05T18:23:45.123Z",
          "gamesAnalyzed": 25,
          "AA5": 68.4,
          "AA15": 71.2,
          "AA25": 69.8
        }
      }
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": "Card not found"
}
```

**Esempio:**
```bash
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/single?key=USR_user123:ATL:adrian-simon-gill"
```

---

#### 4. Lista carte utente

**GET** `/api/cards?userId={userId}&[clubCode={clubCode}]&[limit={limit}]&[cursor={cursor}]`

Recupera tutte le carte di un utente, con opzioni di filtro e paginazione.

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Default | Descrizione |
|-----------|------|--------------|---------|-------------|
| `userId` | string | Sì | - | ID utente |
| `clubCode` | string | No | - | Filtra per club (es: "ATL") |
| `limit` | number | No | 1000 | Max 1000 carte per pagina |
| `cursor` | string | No | - | Paginazione (dal campo `cursor` della risposta precedente) |

**Response (200):**
```json
{
  "userId": "user123",
  "count": 6,
  "complete": true,
  "cursor": "...",
  "cards": [
    {
      "key": "USR_user123:SEA:nicolas-dubersarsky",
      "value": {
        "rarity": "limited",
        "serialNumber": 211,
        "userId": "user123",
        "clubCode": "SEA",
        "playerSlug": "nicolas-dubersarsky",
        "slug": "nicolas-dubersarsky-2025-limited-211",
        "leagueName": "Major League Soccer",
        "so5Scores": [
          { "score": 72.5, "projectedScore": 75.0, "scoreStatus": "SCORED" }
        ],
        "savedAt": "2026-03-05T15:44:09.357Z"
      }
    }
  ]
}
```

**Esempi:**
```bash
# Tutte le carte di un utente
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards?userId=user123"

# Solo carte di un club specifico
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards?userId=user123&clubCode=ATL"

# Paginazione - prima pagina con 50 risultati
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards?userId=user123&limit=50"

# Paginazione - pagina successiva (usa cursor dalla risposta precedente)
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards?userId=user123&limit=50&cursor=..."
```

---

#### 4b. Lista carte con dati giocatore

**GET** `/api/cards/with-players?userId={userId}&[clubCode={clubCode}]&[limit={limit}]&[cursor={cursor}]`

Recupera tutte le carte di un utente con i dati del giocatore corrispondente innestati in ogni carta.

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Default | Descrizione |
|-----------|------|--------------|---------|-------------|
| `userId` | string | Sì | - | ID utente |
| `clubCode` | string | No | - | Filtra per club (es: "ATL") |
| `limit` | number | No | 1000 | Max 1000 carte per pagina |
| `cursor` | string | No | - | Paginazione |

**Response (200):**
```json
{
  "userId": "user123",
  "count": 1,
  "complete": true,
  "cards": [
    {
      "key": "USR_user123:SEA:nicolas-dubersarsky",
      "value": {
        "rarity": "limited",
        "serialNumber": 211,
        "userId": "user123",
        "clubCode": "SEA",
        "playerSlug": "nicolas-dubersarsky",
        "slug": "nicolas-dubersarsky-2025-limited-211",
        "leagueName": "Major League Soccer",
        "so5Scores": [
          { "score": 72.5, "projectedScore": 75.0, "scoreStatus": "SCORED" }
        ],
        "savedAt": "2026-03-05T16:02:21.547Z"
      },
      "playerData": {
        "slug": "nicolas-dubersarsky",
        "name": "Nicolás Dubersarsky",
        "clubSlug": "seattle-sounders",
        "clubName": "Seattle Sounders",
        "clubCode": "SEA",
        "position": "Midfielder",
        "stats": {
          "aaAnalysis": {
            "calculatedAt": "2026-03-05T18:23:45.123Z",
            "gamesAnalyzed": 25,
            "AA5": 68.4,
            "AA15": 71.2,
            "AA25": 69.8
          }
        }
      }
    }
  ]
}
```

**Note:**
- `playerData` è `null` se il giocatore non è trovato nel KV
- Ogni carta richiede una lettura aggiuntiva dal KV (limit 100 per performance)
- I dati carta e giocatore sono sanitizzati (vedi sezione [Struttura Dati](#struttura-dati))

**Esempio:**
```bash
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/with-players?userId=user123"
```

---

#### 5. Conta carte utente

**GET** `/api/cards/count?userId={userId}&[clubCode={clubCode}]`

Restituisce il numero totale di carte di un utente.

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `userId` | string | Sì | ID utente |
| `clubCode` | string | No | Filtra per club |

**Response (200):**
```json
{
  "userId": "user123",
  "clubCode": "ATL",
  "count": 15
}
```

**Esempi:**
```bash
# Conta tutte le carte
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/count?userId=user123"

# Conta carte di un club specifico
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/count?userId=user123&clubCode=MIA"
```

---

#### 6. Elimina carta

**DELETE** `/api/cards/{key}`

Elimina una carta specifica dal KV store.

**URL Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `key` | string | Chiave completa della carta (URL-encoded) |

**Response Success (200):**
```json
{
  "success": true,
  "key": "USR_user123:ATL:adrian-simon-gill"
}
```

**Response Error (400):**
```json
{
  "success": false,
  "key": "invalid-key",
  "error": "Invalid card key format"
}
```

**Esempio cURL:**
```bash
curl -X DELETE "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/USR_user123:ATL:adrian-simon-gill"
```

---

#### 7. Invalida cache (manuale)

**POST** `/api/cache/invalidate?userId={userId}`

Invalida manualmente la cache per un utente specifico. Utile quando i dati sono stati modificati direttamente nel KV (es. tramite wrangler CLI) e la cache contiene dati vecchi.

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `userId` | string | Sì | ID utente |

**Response Success (200):**
```json
{
  "success": true,
  "message": "Cache invalidated for user: user123",
  "timestamp": "2026-03-05T16:30:00.000Z"
}
```

**Esempio:**
```bash
# Invalida tutta la cache per un utente
curl -X POST "https://sorare-mls-sync.loziobiz.workers.dev/api/cache/invalidate?userId=test_user"
```

**Note:**
- Invalida **tutte** le URL GET associate all'utente (`/api/cards`, `/api/cards/with-players`, `/api/cards/count`)
- La prossima richiesta GET ricostruirà la cache con i dati freschi dal KV
- Non richiede un body nella richiesta

---

## Struttura Dati

### Card Object

Il sistema salva automaticamente i seguenti campi. I dati vengono **sanitizzati** in output:

```typescript
interface CardData {
  // Campi utente (richiesti)
  userId: string;
  clubCode: string;
  playerSlug: string;
  
  // Campi opzionali (definiti dall'utente in cardData)
  rarity?: "limited" | "rare" | "super_rare" | "unique" | string;
  serialNumber?: number;
  purchasePrice?: number;
  purchasedAt?: string;
  power?: number;
  
  // Campi API Sorare (se presenti)
  slug?: string;                    // Slug completo della carta
  leagueName?: string;              // Nome lega (estratto da activeCompetitions)
  so5Scores?: So5Score[];           // Ultimi punteggi (filtrati)
  
  // Campi automatici (aggiunti dal sistema)
  savedAt: string;                  // ISO timestamp
}

interface So5Score {
  score: number;
  projectedScore: number;
  scoreStatus: string;              // "SCORED", "DNP", ecc.
}
```

**Note sulla sanitizzazione:**
- `activeCompetitions` → rimosso, estratto solo `leagueName` (MLS)
- `ownershipHistory` → rimosso
- `so5Scores` → solo `score`, `projectedScore`, `scoreStatus`

### Key Format

```
USR_{USER_ID}:{CLUB_CODE}:{PLAYER_SLUG}

Esempi:
- USR_user123:ATL:adrian-simon-gill
- USR_user456:MIA:lionel-messi
- USR_user789:LAFC:denis-bouanga
```

---

### Player Stats - AA Analysis

Quando si usa l'endpoint `/api/cards/with-players` o `/api/cards/single`, il campo `playerData.stats.aaAnalysis` contiene:

```typescript
{
  calculatedAt: string;        // ISO timestamp
  gamesAnalyzed: number;       // Partite analizzate
  AA5: number | null;          // Media AA ultime 5 partite
  AA15: number | null;         // Media AA ultime 15 partite  
  AA25: number | null;         // Media AA ultime 25 partite
}
```

**Nota:** Il campo `validScores` (array dei punteggi grezzi) viene rimosso dalla risposta per ridurre la dimensione.

---

### Player Stats - nextFixture

Quando si usa l'endpoint `/api/cards/with-players`, il campo `playerData.stats.odds.nextFixture` contiene:

```typescript
{
  fixtureDate: string;        // Data partita ISO
  opponent: string;           // Nome squadra avversaria
  opponentCode: string;       // Codice 3 lettere avversario (es: "MIA")
  isHome: boolean;            // True se il giocatore gioca in casa
  startingOdds: {
    starterOddsBasisPoints: number;  // Probabilità titolarità (basis points)
  };
  teamWinOdds: {
    winOddsBasisPoints: number;
    drawOddsBasisPoints: number;
    loseOddsBasisPoints: number;
  };
}
```

**Esempio:**
```json
{
  "fixtureDate": "2024-03-15T20:00:00Z",
  "opponent": "Inter Miami CF",
  "opponentCode": "MIA",
  "isHome": true,
  "startingOdds": {
    "starterOddsBasisPoints": 7500
  },
  "teamWinOdds": {
    "winOddsBasisPoints": 5500,
    "drawOddsBasisPoints": 2500,
    "loseOddsBasisPoints": 2000
  }
}
```

---

## Errori Comuni

| Codice | Errore | Causa |
|--------|--------|-------|
| 400 | Missing required parameter: userId | Parametro `userId` mancante |
| 400 | Invalid request. Required: userId, clubCode, playerSlug | Body JSON incompleto |
| 400 | Invalid card key format | DELETE con chiave malformata |
| 400 | Batch too large. Max 500 cards per request | Batch > 500 carte |
| 500 | Various KV errors | Errore Cloudflare KV |

---

## Rate Limits

| Operazione | Limite | Note |
|------------|--------|------|
| Singola carta | Nessun limite specifico | - |
| Batch | Max 500 carte | - |
| List | Max 1000 risultati | Usare `cursor` per paginazione |
| Globale KV | ~1 write/sec per key | Key diverse = parallelismo automatico |

---

## CORS

Tutti gli endpoint supportano CORS per richieste cross-origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

Preflight OPTIONS requests sono gestiti automaticamente.

---

## Cache

Gli endpoint GET sono **cachati automaticamente** usando la Cloudflare Cache API.

### TTL (Time To Live)
- **Durata**: 24 ore (86400 secondi)
- **Header**: `Cache-Control: public, max-age=86400`

### Endpoint cachati
| Endpoint | Metodo | Cache |
|----------|--------|-------|
| `/api/cards` | GET | ✅ Sì, 4h |
| `/api/cards/with-players` | GET | ✅ Sì, 4h |
| `/api/cards/count` | GET | ✅ Sì, 4h |
| `/api/cards` | POST | ❌ No (invalida cache) |
| `/api/cards/batch` | POST | ❌ No (invalida cache) |
| `/api/cards/{key}` | DELETE | ❌ No (invalida cache) |

### Invalidazione automatica
La cache viene **invalidata automaticamente** quando:
- Si salva una nuova carta (`POST /api/cards`)
- Si salvano carte in batch (`POST /api/cards/batch`)
- Si elimina una carta (`DELETE /api/cards/{key}`)

L'invalidazione avviene per **tutte le URL associate all'utente** modificato, includendo:
- `/api/cards?userId=xxx`
- `/api/cards?userId=xxx&clubCode=yyy`
- `/api/cards/with-players?userId=xxx`
- `/api/cards/count?userId=xxx`

### Header nelle risposte cachate
Le risposte includono l'header:
```
Cache-Control: public, max-age=86400
```

### Note importanti
- La cache è **locale al data center Cloudflare** (non globale)
- La prima richiesta dopo l'invalidazione sarà un **cache miss**
- I log del Worker mostrano `[CACHE HIT]` o `[CACHE MISS]` per debug

---

## Cron Jobs

Il worker esegue anche operazioni schedulate (cron) per mantenere aggiornati i dati giocatori:

| Cron | Frequenza | Azione |
|------|-----------|--------|
| `0 8 * * 2` | Martedì 08:00 UTC | Extract players (nuovi giocatori) |
| `0 8 * * 3` | Mercoledì 08:00 UTC | Analyze home/away + AA |
| `0 8 * * 4` | Giovedì 08:00 UTC | Analyze odds |
| `0 20 * * 5` | Venerdì 20:00 UTC | Analyze odds |
| `0 12 * * 7` | Domenica 12:00 UTC | Analyze odds |

---

## File Sorgente

- `src/worker/handlers/user-cards.ts` - Logica business carte utente
- `src/worker/index.ts` - Routing HTTP (righe ~185-260)
