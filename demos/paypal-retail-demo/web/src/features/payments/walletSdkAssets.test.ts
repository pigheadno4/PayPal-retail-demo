import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("wallet browser SDK assets", () => {
  it("loads the auto-updating Apple Pay SDK and the Google Pay SDK before React", () => {
    const html = readFileSync(resolve(projectRoot, "web/index.html"), "utf8");
    const appleSdkUrl =
      "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";
    const googleSdkUrl = "https://pay.google.com/gp/p/js/pay.js";
    const appleScript = html.match(
      /<script[^>]*applepay\.cdn-apple\.com\/jsapi\/1\.latest\/apple-pay-sdk\.js[^>]*><\/script>/,
    )?.[0];
    const googleScript = html.match(
      /<script[^>]*pay\.google\.com\/gp\/p\/js\/pay\.js[^>]*><\/script>/,
    )?.[0];

    expect(appleScript).toContain('crossorigin="anonymous"');
    expect(appleScript).not.toContain("integrity=");
    expect(googleScript).toBeTruthy();
    expect(html.indexOf(appleSdkUrl)).toBeLessThan(
      html.indexOf('<script type="module" src="/src/main.tsx"></script>'),
    );
    expect(html.indexOf(googleSdkUrl)).toBeLessThan(
      html.indexOf('<script type="module" src="/src/main.tsx"></script>'),
    );
  });

  it("publishes PayPal's Apple Pay sandbox domain-association payload", () => {
    const associationPath = resolve(
      projectRoot,
      "web/public/.well-known/apple-developer-merchantid-domain-association",
    );

    expect(existsSync(associationPath)).toBe(true);
    const association = readFileSync(associationPath, "utf8").trim();
    expect(association.length).toBeGreaterThan(9000);
    expect(association).toMatch(/^[0-9A-F]+$/);
  });
});
