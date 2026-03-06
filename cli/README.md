# Sorare AI CLI Tools

Collection of command-line tools for Sorare data analysis and player analytics. This project supports both **local analysis** (via JSON files) and **cloud synchronization** (via Cloudflare KV and Workers).

## Setup

```bash
cd cli
pnpm install
```

## Authentication (Required)

The CLI needs a JWT token to access Sorare APIs.

### Quick Setup

1. Open the Sorare AI Dashboard in your browser.
2. Go to Settings → click "Copy JWT Token".
3. Paste it in the CLI:
   ```bash
   pnpm import-token <paste-your-token-here>
   ```

The token will be saved to `.env.local` and used automatically by all commands.

---

## 📁 Local Analysis (JSON-based)

All downloaded data files are stored in `./data/` (gitignored).

### 1. Extract MLS Players
Fetch all player slugs and basic info from MLS teams:
```bash
pnpm extract-mls-players
# Generates: ./data/mls-players.json and ./data/mls-players-slugs.json
```

### 2. Analyze All MLS Players (Local)
Bulk analysis of players with rate limiting, saving results to a local JSON:
```bash
pnpm analyze-mls
# Generates: ./data/mls-analyzed.json
# Options: --delay=2000, --limit=50, --position=Forward, --resume, --games=30
```

### 3. Single Player History
Fetch historical SO5 scores for a specific player:
```bash
pnpm player:history kylian-mbappe
```

---

## ☁️ Cloud Sync (Cloudflare KV & Workers)

The system uses Cloudflare KV to store analytics for the web dashboard.

### KV Data Strategy: "Alive-Only"
To optimize performance and stay within API limits, the system only stores **"alive" players** (those with at least one All-Around score: AA5, AA15, or AA25).

### Key Format & Metadata
- **Keys**: `CLUB_CODE:player-slug` (e.g., `MIA:lionel-messi`).
- **Metadata**: Stores `name`, `clubSlug`, `position`, and `hasAA` flag for O(1) filtering.

### KV Data Structure (Complete Example)
Each "alive" player is stored as a comprehensive JSON object:

```json
{
  "slug": "aleksey-miranchuk",
  "name": "Aleksey Miranchuk",
  "clubSlug": "atlanta-united-atlanta-georgia",
  "clubName": "Atlanta United",
  "clubCode": "ATL",
  "position": "Midfielder",
  "stats": {
    "homeAwayAnalysis": {
      "calculatedAt": "2026-03-03T21:43:39.951Z",
      "gamesAnalyzed": 50,
      "home": { "games": 22, "average": 57.85 },
      "away": { "games": 27, "average": 48.21 },
      "homeAdvantageFactor": 0.2001
    },
    "aaAnalysis": {
      "calculatedAt": "2026-03-04T14:33:34.645Z",
      "gamesAnalyzed": 25,
      "AA5": 6.12,
      "AA15": 7.57,
      "AA25": null
    },
    "odds": {
      "calculatedAt": "2026-03-05T11:00:00Z",
      "nextFixture": {
        "fixtureDate": "2026-03-08T20:00:00Z",
        "opponent": "Real Salt Lake",
        "opponentCode": "RSL",
        "isHome": true,
        "startingOdds": { "starterOddsBasisPoints": 8500 },
        "teamWinOdds": {
          "winOddsBasisPoints": 4400,
          "drawOddsBasisPoints": 2600,
          "loseOddsBasisPoints": 3000
        }
      }
    }
  }
}
```

### Sync Workers (Cron Triggers)
The worker handles automated data synchronization:
- **Tuesday 08:00 UTC**: `extract-players` (Syncs registry).
- **Wednesday 08:00 UTC**: `analyze-homeaway` + `analyze-aa`.
- **Thu-Sun (Every 4h)**: `analyze-odds` (Starting/Win probabilities).

### Manual Trigger
Trigger any job via HTTP POST:
```bash
curl -X POST https://your-worker.workers.dev/trigger \
    -H "Content-Type: application/json" \
    -d '{"job":"analyze-odds"}'
```

---

## Available Cloud Commands

### Import to KV
Import "alive" players from your local `data/mls-players.json` to Cloudflare KV:
```bash
pnpm run import-kv
```

### Clear KV Database
Wipe all records from the production KV namespace:
```bash
pnpm run clear-kv
```

### Deploy Worker
Deploy the sync worker to Cloudflare:
```bash
pnpm run worker:deploy
```

---

## Architecture

```
cli/
├── src/
│   ├── worker/          # Sync Worker (Cron & Trigger logic)
│   ├── api/             # HTTP API for Dashboard access
│   ├── commands/        # CLI scripts (Local tools & KV management)
│   ├── lib/             # Shared logic (Sorare client, types)
│   └── worker/lib/      # Optimized KV Repository (with caching)
├── data/                # Local JSON databases
└── wrangler.jsonc       # Cloudflare config
```

## Optimizations
- **GraphQL Batching**: Requests are grouped in lots of 50.
- **In-Memory Caching**: KV reads are cached during execution to avoid redundant GETs.
- **Light Loading**: Uses KV Metadata to list players without fetching full JSON.
- **Delta Updates**: KV writes only occur if data has actually changed.
