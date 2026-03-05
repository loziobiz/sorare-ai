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
| `/api/cards?userId=xxx` | GET | Lista carte |
| `/api/cards/with-players?userId=xxx` | GET | Lista carte + dati giocatore |
| `/api/cards/count?userId=xxx` | GET | Conta carte |
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

#### 3. Lista carte utente

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
      "key": "USR_user123:ATL:adrian-simon-gill",
      "value": {
        "rarity": "limited",
        "serialNumber": 42,
        "userId": "user123",
        "clubCode": "ATL",
        "playerSlug": "adrian-simon-gill",
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

#### 3b. Lista carte con dati giocatore

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
      "key": "USR_user123:ATL:adrian-simon-gill",
      "value": {
        "rarity": "limited",
        "serialNumber": 42,
        "userId": "user123",
        "clubCode": "ATL",
        "playerSlug": "adrian-simon-gill",
        "savedAt": "2026-03-05T16:02:21.547Z"
      },
      "playerData": {
        "slug": "adrian-simon-gill",
        "name": "Adrian Gill",
        "clubSlug": "atlanta-united-atlanta-georgia",
        "clubName": "Atlanta United",
        "clubCode": "ATL",
        "position": "Midfielder",
        "stats": {
          "homeAwayAnalysis": {
            "calculatedAt": "2026-03-04T22:17:01.092Z",
            "gamesAnalyzed": 2,
            "home": { "games": 0, "average": 0 },
            "away": { "games": 0, "average": 0 },
            "homeAdvantageFactor": 0
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

**Esempio:**
```bash
curl "https://sorare-mls-sync.loziobiz.workers.dev/api/cards/with-players?userId=user123"
```

---

#### 4. Conta carte utente

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

#### 5. Elimina carta

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

## Struttura Dati

### Card Object

Il sistema salva automaticamente i seguenti campi:

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
  
  // Campi automatici (aggiunti dal sistema)
  savedAt: string;  // ISO timestamp
}
```

### Key Format

```
USR_{USER_ID}:{CLUB_CODE}:{PLAYER_SLUG}

Esempi:
- USR_user123:ATL:adrian-simon-gill
- USR_user456:MIA:lionel-messi
- USR_user789:LAFC:denis-bouanga
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
