import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🧹 Starting KV Cleanup...");

  try {
    let deletedTotal = 0;
    let hasMore = true;

    while (hasMore) {
      console.log("Fetching next batch of keys...");
      const listOutput = execSync(`npx wrangler kv key list --binding=MLS_PLAYERS --preview false`, { encoding: 'utf-8' });
      const keys = JSON.parse(listOutput);
      
      if (!keys || keys.length === 0) {
        console.log(`✅ KV is now empty. Total deleted: ${deletedTotal}`);
        hasMore = false;
        break;
      }

      console.log(`Found ${keys.length} keys in this batch.`);

      // 2. Crea il file per il bulk delete
      const keyNames = keys.map((k: any) => k.name);
      const tempFile = path.join(process.cwd(), `temp-keys-to-delete-${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(keyNames));

      // 3. Esegui il bulk delete
      console.log(`Executing bulk delete for ${keyNames.length} keys...`);
      execSync(`npx wrangler kv bulk delete ${tempFile} --binding=MLS_PLAYERS --preview false --force`, { stdio: 'inherit' });

      deletedTotal += keyNames.length;
      
      // Pulizia
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      // Piccola pausa per lasciare respirare le API
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log("✅ KV Cleanup completed successfully.");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}

main();
