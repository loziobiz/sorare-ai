import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Tipo per i dati del giocatore da importare
interface LocalPlayer {
  slug: string;
  name: string;
  clubSlug: string;
  clubName: string;
  position: string;
  clubCode?: string;
  stats?: any;
}

interface LocalDatabase {
  players: LocalPlayer[];
}

const DATA_FILE = path.join(process.cwd(), "data", "mls-players.json");
const CHUNK_SIZE = 50; // Quanti giocatori caricare per ogni comando bulk put per non saturare la CLI

async function main() {
  console.log("🚀 Starting import of player data to Cloudflare KV...");

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Data file not found at: ${DATA_FILE}`);
    process.exit(1);
  }

  // Leggi e parse del file locale
  console.log("📖 Reading local database...");
  const rawData = fs.readFileSync(DATA_FILE, "utf-8");
  let db: LocalDatabase;

  try {
    db = JSON.parse(rawData);
  } catch (e) {
    console.error("❌ Failed to parse JSON database:", e);
    process.exit(1);
  }

  // FILTRO A MONTE: Solo giocatori con statistiche AA (All-Around)
  const allPlayers = db.players || [];
  const players = allPlayers.filter((player) => {
    return !!(
      player.stats?.aaAnalysis?.AA5 != null ||
      player.stats?.aaAnalysis?.AA15 != null ||
      player.stats?.aaAnalysis?.AA25 != null
    );
  });

  console.log(
    `📊 Found ${allPlayers.length} total players. Filtered to ${players.length} "alive" players (with AA stats).`
  );

  if (players.length === 0) {
    console.log("⚠️ No players to import.");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  // Dividiamo i giocatori in chunks per l'importazione
  for (let i = 0; i < players.length; i += CHUNK_SIZE) {
    const chunk = players.slice(i, i + CHUNK_SIZE);
    console.log(
      `\n⏳ Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(players.length / CHUNK_SIZE)} (Players ${i + 1}-${Math.min(i + CHUNK_SIZE, players.length)})...`
    );

    // Creiamo un file JSON temporaneo per il comando bulk
    const bulkData = chunk.map((player) => {
      // Usa "UNK" come clubCode di fallback se non è presente, esattamente come fa il Worker
      const clubCode = player.clubCode || "UNK";
      const keyName = `${clubCode}:${player.slug}`;

      // Calcola se ha dati AA
      const hasAA = !!(
        player.stats?.aaAnalysis?.AA5 != null ||
        player.stats?.aaAnalysis?.AA15 != null ||
        player.stats?.aaAnalysis?.AA25 != null
      );

      return {
        key: keyName,
        value: JSON.stringify(player),
        metadata: {
          name: player.name,
          clubSlug: player.clubSlug,
          position: player.position,
          hasAA,
        },
      };
    });

    const tempFile = path.join(
      process.cwd(),
      `temp-kv-bulk-${Date.now()}.json`
    );
    fs.writeFileSync(tempFile, JSON.stringify(bulkData));

    try {
      // Eseguiamo wrangler kv bulk put
      console.log(`   Uploading ${chunk.length} keys to KV...`);
      execSync(
        `npx wrangler kv bulk put ${tempFile} --binding=SORARE_AI_DATA --preview false`,
        { stdio: "inherit" }
      );
      successCount += chunk.length;
      console.log("   ✅ Chunk processed successfully.");
    } catch (e) {
      console.error("   ❌ Error executing bulk put:", e);
      errorCount += chunk.length;
    } finally {
      // Puliamo il file temporaneo
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  console.log("\n🎉 Import Complete!");
  console.log(`   ✅ Successfully imported: ${successCount} players`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed to import: ${errorCount} players`);
  }
}

main().catch(console.error);
