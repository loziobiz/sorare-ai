# MLS Player Sync API Documentation

API per la gestione dei dati giocatori MLS e delle carte utente Sorare.

**Base URL:** `https://sorare-mls-sync.loziobiz.workers.dev`

---

## User Cards API

Gestione delle carte possedute dagli utenti. Ogni carta è salvata in Cloudflare KV con formato chiave:
```
USR_{USER_ID}:{CLUB_CODE}:{CARD_SLUG}
```

**Note sulla chiave:**
- `CARD_SLUG` è lo slug completo della carta (es: `matteo-meisl-2023-limited-169`)
- Questo permette di avere multiple carte dello stesso giocatore (stagioni/rarità diverse)
- Esempio: un utente può avere sia `matteo-meisl-2023-limited-169` che `matteo-meisl-2024-limited-18`

### Riepilogo Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/cards` | POST | Salva singola carta |
| `/api/cards/batch` | POST | Salva batch (max 500) |
| `/api/cards/single?userId=&clubCode=&slug=` | GET | Recupera singola carta |
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
  "cardData": {              // Dati aggiuntivi della carta (richiesto)
    "slug": "string",        // Slug completo della carta (richiesto, es: "matteo-meisl-2023-limited-169")
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
  "key": "USR_user123:ADM:matteo-meisl-2023-limited-169"
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
    "clubCode": "ADM",
    "playerSlug": "matteo-meisl",
    "cardData": {
      "slug": "matteo-meisl-2023-limited-169",
      "rarity": "limited",
      "serialNumber": 169,
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
    "total": 2,
    "success": 2,
    "errors": 0
  },
  "results": [
    { "success": true, "key": "USR_user123:MIA:lionel-messi-2024-super_rare-7" },
    { "success": true, "key": "USR_user123:LAFC:denis-bouanga-2023-rare-123" }
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
        "cardData": { 
          "slug": "lionel-messi-2024-super_rare-7",
          "rarity": "super_rare", 
          "serialNumber": 7 
        }
      },
      {
        "userId": "user123",
        "clubCode": "LAFC",
        "playerSlug": "denis-bouanga",
        "cardData": { 
          "slug": "denis-bouanga-2023-rare-123",
          "rarity": "rare", 
          "serialNumber": 123 
        }
      }
    ]
  }'
```

---

#### 3. Recupera singola carta

**GET** `/api/cards/single?userId={userId}&clubCode={clubCode}&slug={slug}`

Recupera una singola carta tramite userId, clubCode e slug della carta, con dati giocatore innestati.

**Nota sui playerSlug**: Se il `playerSlug` nella carta non corrisponde a quello nel database (es. `andrew-thomas` vs `andrew-thomas-1998-09-01`), il sistema tenta automaticamente di estrarre lo slug corretto dallo slug completo della carta (formato: `{player-slug}-{anno}-{rarity}-{serial}`).

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `userId` | string | Sì | ID utente |
| `clubCode` | string | Sì | Codice club 3 lettere |
| `slug` | string | Sì | Slug completo della carta (es: `matteo-meisl-2023-limited-169`) |

**Response Success (200):**
```json
{
  "success": true,
  "card": {
    "key": "USR_user123:ADM:matteo-meisl-2023-limited-169",
    "value": {
      "rarity": "limited",
      "serialNumber": 169,
      "userId": "user123",
      "clubCode": "ADM",
      "playerSlug": "matteo-meisl",
      "slug": "matteo-meisl-2023-limited-169",
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
      "slug": "matteo-meisl",
      "name": "Matteo Meisl",
      "clubCode": "ADM",
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
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/single?userId=user123&clubCode=ADM&slug=matteo-meisl-2023-limited-169"
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
  "count": 3,
  "complete": true,
  "cursor": "...",
  "cards": [
    {
      "key": "USR_user123:ADM:matteo-meisl-2023-limited-169",
      "value": {
        "rarity": "limited",
        "serialNumber": 169,
        "userId": "user123",
        "clubCode": "ADM",
        "playerSlug": "matteo-meisl",
        "slug": "matteo-meisl-2023-limited-169",
        "leagueName": "Major League Soccer",
        "so5Scores": [
          { "score": 72.5, "projectedScore": 75.0, "scoreStatus": "SCORED" }
        ],
        "savedAt": "2026-03-05T15:44:09.357Z"
      }
    },
    {
      "key": "USR_user123:ADM:matteo-meisl-2024-limited-18",
      "value": {
        "rarity": "limited",
        "serialNumber": 18,
        "userId": "user123",
        "clubCode": "ADM",
        "playerSlug": "matteo-meisl",
        "slug": "matteo-meisl-2024-limited-18",
        "leagueName": "Major League Soccer",
        "so5Scores": [
          { "score": 68.3, "projectedScore": 70.0, "scoreStatus": "SCORED" }
        ],
        "savedAt": "2026-03-05T16:20:15.123Z"
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
      "key": "USR_user123:ADM:matteo-meisl-2023-limited-169",
      "value": {
        "rarity": "limited",
        "serialNumber": 169,
        "userId": "user123",
        "clubCode": "ADM",
        "playerSlug": "matteo-meisl",
        "slug": "matteo-meisl-2023-limited-169",
        "leagueName": "Major League Soccer",
        "so5Scores": [
          { "score": 72.5, "projectedScore": 75.0, "scoreStatus": "SCORED" }
        ],
        "savedAt": "2026-03-05T16:02:21.547Z"
      },
      "playerData": {
        "slug": "matteo-meisl",
        "name": "Matteo Meisl",
        "clubSlug": "atlanta-united",
        "clubName": "Atlanta United FC",
        "clubCode": "ADM",
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
  "key": "USR_user123:ADM:matteo-meisl-2023-limited-169"
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
curl -X DELETE "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/USR_user123:ADM:matteo-meisl-2023-limited-169"
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
USR_{USER_ID}:{CLUB_CODE}:{CARD_SLUG}

Esempi:
- USR_user123:ADM:matteo-meisl-2023-limited-169
- USR_user123:ADM:matteo-meisl-2024-limited-18
- USR_user456:MIA:lionel-messi-2024-super_rare-7
- USR_user789:LAFC:denis-bouanga-2023-rare-123
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
| 400 | Invalid request. Required: userId, clubCode, playerSlug, cardData.slug | Body JSON incompleto o cardData.slug mancante |
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

## User JWT & Auto-Sync API

Gestione automatica della sincronizzazione carte tramite JWT Sorare salvato nel KV.

### Flusso completo

```
1. Utente fa login su Sorare → Client ottiene JWT
2. Client chiama POST /api/user/jwt → Worker salva token cifrato
3. Ogni martedì 06:00 UTC: Cron scarica carte automaticamente
4. Utente può forzare sync: POST /api/user/refresh-cards
```

### Endpoints

#### 1. Salva JWT utente

**POST** `/api/user/jwt`

Salva il JWT Sorare dell'utente nel KV (cifrato) per sincronizzazioni automatiche future.

**Request Body:**
```json
{
  "userId": "alessandro.bisi",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `userId` | string | Sì | ID utente univoco |
| `token` | string | Sì | JWT valido da Sorare API |

**Response Success (200):**
```json
{
  "success": true,
  "message": "JWT saved successfully"
}
```

**Response Error (400/500):**
```json
{
  "error": "Invalid JWT format"
}
```

**Esempio cURL:**
```bash
curl -X POST https://sorare-mls-sync.loziobiz.workers.dev/api/user/jwt \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alessandro.bisi",
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NWU0YjBkZi0yNzhkLTQyM2QtOGEzMS00OTJlMTkxMjUwMTAiLCJzY3AiOiJ1c2VyIiwiYXVkIjoic29yYXJlLWFpIiwiaWF0IjoxNzcyMDU1MzgyLCJleHAiOjE3NzQ2NDczODJ9..."
  }'
```

**Note:**
- Il token viene cifrato prima del salvataggio
- La scadenza (`exp`) viene estratta e salvata separatamente
- Durata tipica JWT Sorare: ~30 giorni

---

#### 2. Stato sincronizzazione

**GET** `/api/user/sync-status?userId={userId}`

Recupera lo stato del token e dell'ultima sincronizzazione.

**Query Parameters:**
| Parametro | Tipo | Obbligatorio | Descrizione |
|-----------|------|--------------|-------------|
| `userId` | string | Sì | ID utente |

**Response Success (200):**
```json
{
  "userId": "alessandro.bisi",
  "hasToken": true,
  "isValid": true,
  "expiresInDays": 21,
  "lastSyncAt": "2026-03-06T12:00:00.000Z"
}
```

**Response Error (404):**
```json
{
  "error": "No JWT found for user"
}
```

**Esempio cURL:**
```bash
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/user/sync-status?userId=alessandro.bisi"
```

**Uso consigliato lato client:**
```javascript
const status = await fetch('/api/user/sync-status?userId=' + userId).then(r => r.json());

if (status.expiresInDays < 3) {
  // Mostra: "Token in scadenza, rieffettua il login"
}

if (!status.lastSyncAt || isOld(status.lastSyncAt, 7)) {
  // Mostra: "Dati obsoleti, aggiorna ora"
}
```

---

#### 3. Refresh carte on-demand

**POST** `/api/user/refresh-cards`

Forza immediatamente il download delle carte da Sorare API per l'utente specificato.

**Request Body:**
```json
{
  "userId": "alessandro.bisi",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `userId` | string | Sì | ID utente |
| `token` | string | Sì | JWT valido (verificato contro quello salvato) |

**Response Success (200):**
```json
{
  "success": true,
  "userId": "alessandro.bisi",
  "cardsFound": 1041,
  "cardsSaved": 1041
}
```

**Response Error (401/500):**
```json
{
  "success": false,
  "userId": "alessandro.bisi",
  "cardsFound": 0,
  "cardsSaved": 0,
  "error": "Token expired or invalid"
}
```

**Esempio cURL:**
```bash
curl -X POST https://sorare-mls-sync.loziobiz.workers.dev/api/user/refresh-cards \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alessandro.bisi",
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }'
```

**Note:**
- Se il token è scaduto, l'utente deve rifare login su Sorare
- Il nuovo token viene automaticamente salvato nel KV
- Operazione sincrona: può richiedere tempo per molte carte (usa `--max-time`)

---

### Confronto: Flusso Manuale vs Automatico

| Aspetto | Flusso Manuale | Flusso Automatico (JWT) |
|---------|---------------|------------------------|
| **Trigger** | Client chiama `/api/cards` | Cron ogni martedì 06:00 |
| **JWT** | Non necessario | Richiesto, salvato in KV |
| **Dati** | Client scarica e invia | Worker scarica direttamente |
| **L5/L15/L40** | Foto al momento del salvataggio | Foto al momento del cron |
| **so5Scores** | Storico al momento del salvataggio | Storico al momento del cron |
| **Posizioni** | Fisse alla carta | Fisse alla carta |
| **Uso ideale** | Prima configurazione, carte nuove | Aggiornamento periodico |

**Flusso ibrido consigliato:**
1. **Setup iniziale**: Client scarica tutte le carte e le invia al Worker (completo)
2. **Aggiornamento JWT**: Client invia token dopo ogni login
3. **Aggiornamenti**: Cron automatico ogni martedì mattina
4. **Forzatura**: Utente può cliccare "Aggiorna ora" che chiama `/api/user/refresh-cards`

**Nota importante:** L5/L15/L40 nelle carte sono sempre "fotografie" al momento del salvataggio (non live). Per dati statistici aggiornati usare il player data con AA analysis.

---

## Cron Jobs

Il worker esegue anche operazioni schedulate (cron) per mantenere aggiornati i dati giocatori e carte utente:

| Cron | Frequenza | Azione |
|------|-----------|--------|
| `0 6 * * 2` | Martedì 06:00 UTC | **Sync user cards** (scarica carte da Sorare per tutti gli utenti con JWT valido) |
| `0 8 * * 2` | Martedì 08:00 UTC | Extract players (nuovi giocatori MLS) |
| `0 8 * * 3` | Mercoledì 08:00 UTC | Analyze home/away + AA |
| `0 8 * * 4` | Giovedì 08:00 UTC | Analyze odds |
| `0 20 * * 5` | Venerdì 20:00 UTC | Analyze odds |
| `0 12 * * 7` | Domenica 12:00 UTC | Analyze odds |

---

## File Sorgente

- `src/worker/handlers/user-cards.ts` - Logica business carte utente
- `src/worker/index.ts` - Routing HTTP (righe ~185-260)
