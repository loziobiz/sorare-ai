#!/usr/bin/env tsx
/**
 * Analyze Cron Logs - CLI Tool
 * 
 * NOTA: L'API Cloudflare Workers Logs richiede query salvate (saved queries).
 * Questo script fornisce strumenti alternativi per il debug dei cron.
 * 
 * Usage:
 *   npx tsx scripts/analyze-cron-logs.ts [command] [options]
 * 
 * Commands:
 *   dashboard          Apre il link al dashboard Cloudflare
 *   trigger <job>      Esegue manualmente un job e mostra i risultati
 *   status             Mostra lo stato attuale del worker
 *   help               Mostra questo help
 * 
 * Jobs per trigger:
 *   sync-user-cards, analyze-odds, analyze-homeaway, analyze-aa, 
 *   extract-players, sync-extra-players
 * 
 * Environment:
 *   CLOUDFLARE_ACCOUNT_ID    - Il tuo Account ID Cloudflare
 *   CLOUDFLARE_API_TOKEN     - API Token con permesso Workers:Read
 * 
 * Esempi:
 *   npx tsx scripts/analyze-cron-logs.ts dashboard
 *   npx tsx scripts/analyze-cron-logs.ts trigger analyze-odds
 *   npx tsx scripts/analyze-cron-logs.ts trigger sync-user-cards
 *   npx tsx scripts/analyze-cron-logs.ts status
 */

import { config } from "dotenv";
import { execSync } from "child_process";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const WORKER_NAME = "sorare-mls-sync";

const DASHBOARD_URL = `https://dash.cloudflare.com/${ACCOUNT_ID}/workers-and-pages/overview/${WORKER_NAME}/production/observability/investigate`;
const WORKER_URL = `https://${WORKER_NAME}.loziobiz.workers.dev`;

interface TriggerResult {
  success: boolean;
  job: string;
  result: unknown;
  timestamp: string;
}

function showHelp(): void {
  console.log(`
📊 Analyze Cron Logs - CLI Tool

NOTA: L'API Cloudflare Workers Logs richiede query salvate (saved queries).
Per analizzare log storici, usa il dashboard Cloudflare.

Comandi disponibili:

1. dashboard
   Apre il link al dashboard Cloudflare per analizzare i log.
   URL: ${DASHBOARD_URL}

2. trigger <job>
   Esegue manualmente un job e mostra i risultati in tempo reale.
   
   Jobs disponibili:
   • sync-user-cards    - Sincronizza carte utente
   • analyze-odds       - Analizza odds giocatori
   • analyze-homeaway   - Analisi home/away
   • analyze-aa         - Analisi All-Around
   • extract-players    - Estrai giocatori MLS
   • sync-extra-players - Sincronizza giocatori extra

3. status
   Mostra lo stato attuale del worker (health check).

4. tail
   Avvia tail per vedere i log in tempo reale (utile durante i test).

Esempi:
   npx tsx scripts/analyze-cron-logs.ts dashboard
   npx tsx scripts/analyze-cron-logs.ts trigger analyze-odds
   npx tsx scripts/analyze-cron-logs.ts trigger sync-user-cards
   npx tsx scripts/analyze-cron-logs.ts status
   npx tsx scripts/analyze-cron-logs.ts tail
`);
}

async function openDashboard(): Promise<void> {
  console.log("\n📊 Dashboard Cloudflare Workers Logs");
  console.log("=" .repeat(60));
  console.log(`\nURL: ${DASHBOARD_URL}`);
  console.log("\nIstruzioni:");
  console.log("1. Clicca sul link sopra (o copia-incolla nel browser)");
  console.log("2. Nel dashboard, usa il 'Query Builder' per filtrare:");
  console.log("   • $cloudflare.event.cron exists (per vedere solo cron)");
  console.log("   • $cloudflare.outcome = 'error' (per vedere errori)");
  console.log("   • timestamp > '2026-03-...' (per filtrare per data)");
  console.log("\n3. Oppure vai su 'Invocations' per vedere l'elenco cron");
  console.log("=" .repeat(60));
  
  // Tenta di aprire il browser automaticamente
  try {
    const platform = process.platform;
    if (platform === "darwin") {
      execSync(`open "${DASHBOARD_URL}"`, { stdio: "ignore" });
      console.log("\n✅ Browser aperto automaticamente");
    } else if (platform === "linux") {
      execSync(`xdg-open "${DASHBOARD_URL}"`, { stdio: "ignore" });
      console.log("\n✅ Browser aperto automaticamente");
    } else {
      console.log("\n⚠️  Apri manualmente il link nel browser");
    }
  } catch {
    console.log("\n⚠️  Apri manualmente il link nel browser");
  }
}

async function triggerJob(job: string): Promise<void> {
  const validJobs = [
    "sync-user-cards",
    "analyze-odds", 
    "analyze-homeaway",
    "analyze-aa",
    "extract-players",
    "sync-extra-players"
  ];

  if (!validJobs.includes(job)) {
    console.error(`❌ Job non valido: ${job}`);
    console.log(`\nJobs validi: ${validJobs.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🚀 Triggering job: ${job}`);
  console.log("=" .repeat(60));
  console.log("⏳ Attendi il completamento (può richiedere diversi minuti)...\n");

  const startTime = Date.now();
  
  try {
    const response = await fetch(`${WORKER_URL}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job }),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Errore (${response.status}): ${error}`);
      process.exit(1);
    }

    const result = await response.json() as TriggerResult;

    console.log(`✅ Job completato in ${duration}s\n`);
    console.log("Risultato:");
    console.log(JSON.stringify(result, null, 2));

    // Analisi specifica per job
    console.log("\n📊 Analisi risultato:");
    if (job === "analyze-odds" && result.result && typeof result.result === "object") {
      const r = result.result as { processed?: number; updated?: number; errors?: number };
      console.log(`   • Giocatori processati: ${r.processed || 0}`);
      console.log(`   • Aggiornamenti: ${r.updated || 0}`);
      console.log(`   • Errori: ${r.errors || 0}`);
    }
    if (job === "sync-user-cards" && result.result && typeof result.result === "object") {
      const r = result.result as { totalCards?: number; usersProcessed?: number };
      console.log(`   • Carte sincronizzate: ${r.totalCards || 0}`);
      console.log(`   • Utenti processati: ${r.usersProcessed || 0}`);
    }

  } catch (error) {
    console.error("❌ Errore:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function checkStatus(): Promise<void> {
  console.log("\n🔍 Checking worker status...\n");

  try {
    const response = await fetch(`${WORKER_URL}/health`);
    const data = await response.json() as { status: string; players: number; timestamp: string };

    console.log("✅ Worker is running\n");
    console.log("Stato:", data.status);
    console.log("Giocatori nel database:", data.players);
    console.log("Ultimo check:", new Date(data.timestamp).toLocaleString());

    // Verifica i cron configurati
    console.log("\n📅 Cron configurati:");
    console.log("   • 0 6,18 * * *   - Sync user cards (ogni 12 ore)");
    console.log("   • 0 8 * * 3      - Extract MLS players (mercoledì)");
    console.log("   • 0 16 * * 2,5   - Analyze home/away + AA (martedì/venerdì)");
    console.log("   • 0 0,8,16 * * * - Analyze odds (ogni 8 ore)");

    // Prossimi cron
    const now = new Date();
    console.log("\n📆 Orario attuale UTC:", now.toISOString());

  } catch (error) {
    console.error("❌ Worker non raggiungibile:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function startTail(): void {
  console.log("\n📜 Avvio tail per log in tempo reale...");
  console.log("Premi Ctrl+C per interrompere\n");
  
  try {
    execSync("npx wrangler tail --format pretty", { stdio: "inherit" });
  } catch {
    // Utente ha premuto Ctrl+C
    console.log("\n\nTail interrotto");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  switch (command) {
    case "dashboard":
      await openDashboard();
      break;
    case "trigger":
      if (!args[1]) {
        console.error("❌ Specifica il job da eseguire");
        console.log("Usage: npx tsx scripts/analyze-cron-logs.ts trigger <job>");
        process.exit(1);
      }
      await triggerJob(args[1]);
      break;
    case "status":
      await checkStatus();
      break;
    case "tail":
      startTail();
      break;
    default:
      console.error(`❌ Comando sconosciuto: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
