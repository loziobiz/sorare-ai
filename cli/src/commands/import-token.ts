#!/usr/bin/env tsx
/**
 * Import JWT Token from Dashboard
 * 
 * Usage:
 *   1. Go to the dashboard in your browser
 *   2. Run in console: copy(localStorage.getItem('sorare_jwt'))
 *   3. Paste the token here:
 * 
 *   pnpm import-token
 *   pnpm import-token <paste-token-here>
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const ENV_FILE = ".env.local";

function parseArgs(): string | null {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return null;
  }
  
  // Join all args in case the token has spaces
  return args.join(" ");
}

function updateEnvFile(key: string, value: string): void {
  let content = "";
  
  if (existsSync(ENV_FILE)) {
    content = readFileSync(ENV_FILE, "utf-8");
  }
  
  // Check if key already exists
  const lines = content.split("\n");
  const keyIndex = lines.findIndex(line => line.startsWith(`${key}=`));
  
  if (keyIndex >= 0) {
    // Update existing key
    lines[keyIndex] = `${key}=${value}`;
    content = lines.join("\n");
  } else {
    // Add new key
    content += content.endsWith("\n") || content === "" ? "" : "\n";
    content += `${key}=${value}\n`;
  }
  
  writeFileSync(ENV_FILE, content);
}

function main() {
  const token = parseArgs();
  
  if (!token) {
    console.log("");
    console.log("📋 How to get your JWT token:");
    console.log("");
    console.log("   1. Open the Sorare AI Dashboard in your browser");
    console.log("   2. Open DevTools (F12) → Console");
    console.log("   3. Run this command:");
    console.log("      copy(localStorage.getItem('sorare:token'))");
    console.log("   4. Paste the token below:");
    console.log("");
    console.log("   Usage: pnpm import-token <your-token>");
    console.log("");
    process.exit(1);
  }
  
  // Basic validation
  if (!token.startsWith("eyJ")) {
    console.error("❌ Invalid JWT token. Should start with 'eyJ'");
    process.exit(1);
  }
  
  try {
    updateEnvFile("SORARE_JWT_TOKEN", token);
    console.log("✅ Token saved to .env.local");
    
    // Also show decoded info
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      console.log("");
      console.log("📊 Token info:");
      console.log(`   Subject: ${payload.sub || "N/A"}`);
      console.log(`   Issued: ${payload.iat ? new Date(payload.iat * 1000).toLocaleString() : "N/A"}`);
      console.log(`   Expires: ${payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "N/A"}`);
    }
  } catch (error) {
    console.error("❌ Error saving token:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
