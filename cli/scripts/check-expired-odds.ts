import { config } from "dotenv";
config({ path: ".env" });

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const KV_ID = "3e19646f99ae4a3dbd80505b9a41e938";

async function listKV(prefix: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/keys?prefix=${prefix}&limit=1000`,
    {
      headers: { "Authorization": `Bearer ${API_TOKEN}` },
    }
  );
  const data = await response.json() as { result: Array<{ name: string }> };
  return data.result || [];
}

async function getKV(key: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/${encodeURIComponent(key)}`,
    {
      headers: { "Authorization": `Bearer ${API_TOKEN}` },
    }
  );
  return response.text();
}

async function main() {
  console.log("🔍 Checking for expired odds...\n");
  const now = new Date();
  
  // Lista tutte le chiavi
  const keys = await listKV("");
  console.log(`Total keys in KV: ${keys.length}\n`);
  
  let withOdds = 0;
  let withExpiredOdds = 0;
  let checked = 0;
  
  for (const key of keys) {
    // Controlla solo chiavi giocatore (non USR_, JWT_, SYSTEM, FORMATION_)
    if (key.name.startsWith("USR_") || 
        key.name.startsWith("JWT_") || 
        key.name.startsWith("SYSTEM") ||
        key.name.startsWith("FORMATION_")) {
      continue;
    }
    
    checked++;
    if (checked % 100 === 0) {
      console.log(`Checked ${checked}/${keys.length}...`);
    }
    
    try {
      const value = await getKV(key.name);
      const player = JSON.parse(value);
      
      if (player.stats?.odds?.nextFixture) {
        withOdds++;
        const fixtureDate = new Date(player.stats.odds.nextFixture.fixtureDate);
        const isExpired = fixtureDate < now;
        
        if (isExpired) {
          withExpiredOdds++;
          console.log(`\n❌ EXPIRED: ${player.name} (${key.name})`);
          console.log(`   Fixture: ${player.stats.odds.nextFixture.fixtureDate}`);
          console.log(`   Opponent: ${player.stats.odds.nextFixture.opponent}`);
          console.log(`   Calculated: ${player.stats.odds.calculatedAt}`);
        }
      }
    } catch (e) {
      // Skip non-player records
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Players checked: ${checked}`);
  console.log(`   Players with odds: ${withOdds}`);
  console.log(`   Players with EXPIRED odds: ${withExpiredOdds}`);
}

main().catch(console.error);
