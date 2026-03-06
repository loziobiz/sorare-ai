import * as __MIDDLEWARE_0__ from "/Users/alessandrobisi/Progetti/sorare-ai/cli/node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_2__ from "/Users/alessandrobisi/Progetti/sorare-ai/cli/node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";
import * as __MIDDLEWARE_1__ from "/Users/alessandrobisi/Progetti/sorare-ai/cli/node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260226.1/node_modules/wrangler/templates/middleware/middleware-scheduled.ts";
import worker from "/Users/alessandrobisi/Progetti/sorare-ai/cli/src/worker/index.ts";

export * from "/Users/alessandrobisi/Progetti/sorare-ai/cli/src/worker/index.ts";

export const __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  __MIDDLEWARE_0__.default,
  __MIDDLEWARE_1__.default,
  __MIDDLEWARE_2__.default,
];
export default worker;
