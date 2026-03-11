/**
 * Cleanup Expired Odds Handler
 *
 * Eseguito ogni giorno alle 08:00 UTC.
 * - Cicla TUTTI i giocatori nel KV che hanno odds
 * - Cancella le odds se la partita è già stata disputata (fixtureDate < now)
 * - Usa ForceUpdateStrategy per forzare la cancellazione anche con valori null
 */

import {
  ForceUpdateStrategy,
  type KVPlayerRepository,
} from "../lib/kv-repository.js";

export interface CleanupExpiredOddsResult {
  scanned: number;
  withOdds: number;
  expired: number;
  cleared: number;
  errors: number;
}

/**
 * Handler principale per pulire le odds scadute
 */
export async function cleanupExpiredOddsHandler(
  repository: KVPlayerRepository
): Promise<CleanupExpiredOddsResult> {
  console.log("🧹 [Cleanup Expired Odds] Starting...");
  console.log("   Checking all players for expired odds...");

  const result: CleanupExpiredOddsResult = {
    scanned: 0,
    withOdds: 0,
    expired: 0,
    cleared: 0,
    errors: 0,
  };

  try {
    const kv = (repository as any).kv as KVNamespace;
    const now = new Date();

    // Scansiona TUTTE le chiavi nel KV (senza filtri)
    let cursor: string | undefined;

    do {
      const listResult = await kv.list({
        prefix: "",
        limit: 1000,
        cursor,
      });

      for (const key of listResult.keys) {
        // Salta chiavi di sistema e carte utente
        if (
          key.name.startsWith("USR_") ||
          key.name.startsWith("JWT_") ||
          key.name.startsWith("SYSTEM:") ||
          key.name.startsWith("FORMATION_")
        ) {
          continue;
        }

        result.scanned++;

        if (result.scanned % 100 === 0) {
          console.log(`   Scanned ${result.scanned} keys...`);
        }

        const value = await kv.get(key.name);
        if (!value) continue;

        try {
          const player = JSON.parse(value) as {
            slug?: string;
            name?: string;
            stats?: {
              odds?: {
                nextFixture?: {
                  fixtureDate?: string;
                } | null;
              } | null;
            } | null;
          };

          // Verifica se ha odds
          const odds = player.stats?.odds;
          if (!odds?.nextFixture?.fixtureDate) {
            continue;
          }

          result.withOdds++;

          const fixtureDate = new Date(odds.nextFixture.fixtureDate);

          // Se la partita è passata, cancella le odds
          if (fixtureDate < now) {
            result.expired++;

            console.log(
              `   🗑️ ${player.name || key.name}: Odds expired (${odds.nextFixture.fixtureDate}), clearing`
            );

            try {
              // Usa ForceUpdateStrategy per forzare l'aggiornamento anche con null
              await repository.updatePlayerStats(
                player.slug || key.name.split(":")[1] || key.name,
                {
                  odds: {
                    calculatedAt: now.toISOString(),
                    nextFixture: null,
                  },
                },
                new ForceUpdateStrategy()
              );

              result.cleared++;
              console.log("      ✅ Cleared");
            } catch (err) {
              result.errors++;
              console.error(
                "      ❌ Failed to clear:",
                err instanceof Error ? err.message : String(err)
              );
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    console.log("\n✅ Cleanup complete:");
    console.log(`   Keys scanned: ${result.scanned}`);
    console.log(`   Players with odds: ${result.withOdds}`);
    console.log(`   Expired odds found: ${result.expired}`);
    console.log(`   Successfully cleared: ${result.cleared}`);
    console.log(`   Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    return result;
  }
}
