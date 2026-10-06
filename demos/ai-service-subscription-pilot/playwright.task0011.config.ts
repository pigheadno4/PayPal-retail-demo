import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/e2e",testMatch:["reactivation.spec.ts","generate-answer.spec.ts","wallet-removal.spec.ts","identity-and-quote.spec.ts","paypal-checkout.spec.ts"],
 outputDir:"task0011-test-results",workers:1,fullyParallel:false,timeout:60000,expect:{timeout:15000},
 use:{baseURL:"http://127.0.0.1:3111",channel:"chrome",trace:"off",serviceWorkers:"block",
  // Context interception supplies synthetic loaders. The non-forwarding local
  // server proxy also confines requests from newly created browser contexts.
  launchOptions:{args:["--proxy-server=http://127.0.0.1:3111","--proxy-bypass-list=127.0.0.1;localhost;[::1]"]}
 },
 projects:[{name:"chromium",use:{viewport:{width:1440,height:1000}}},{name:"mobile-chromium",use:{viewport:{width:390,height:844}}}],
 webServer:{command:"node node_modules/tsx/dist/cli.mjs tests/e2e/support/task0011-server.ts",url:"http://127.0.0.1:3111/api/v1/health",reuseExistingServer:false,timeout:30000}
});
