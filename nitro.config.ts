import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  preset: "cloudflare_module",
  serverAssets: [
    {
      baseName: "public",
      dir: "./public",
    },
  ],
  routeRules: {
    "/sw.js": {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
  },
});
