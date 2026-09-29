// Historical planned filename; this suite is LOCAL SYNTHETIC ONLY.
import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { createServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import type { AccountUsageSummary } from "../../shared/src/usage.js";

const origin = "http://127.0.0.1:4199";
let server: ViteDevServer;

test.beforeAll(async () => {
  server = await createServer({
    configFile: false, envDir: false, root: resolve("web"), plugins: [react()],
    envPrefix: "TASK0009_UNUSED_PUBLIC_",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://127.0.0.1:4199"),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("synthetic-public-placeholder"),
      "import.meta.env.VITE_PAYPAL_CLIENT_ID": JSON.stringify("synthetic-public-placeholder"),
    },
    server: { host: "127.0.0.1", port: 4199, strictPort: true, hmr: false },
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });

/** AC4: inspect real rendered UI. Assertions remain red for product defects. */
async function auditLocalState(page: Page, state: string, twoFixesOnly = false) {
  for (const theme of ["light", "dark"] as const) {
    await test.step(`AC4 ${state} ${theme}`, async () => {
      const toggle = page.locator(".icon-button");
      if (await page.locator("html").getAttribute("data-theme") !== theme) {
        await toggle.click();
        if (await page.locator("html").getAttribute("data-theme") !== theme) await toggle.click();
      }
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const visible = (element: HTMLElement) => element.getClientRects().length > 0;
        const fonts = [...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family);
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          headingFamily: getComputedStyle(document.querySelector("h1,h2")!).fontFamily,
          bodyFamily: getComputedStyle(document.body).fontFamily,
          fonts,
          fontAssets: performance.getEntriesByType("resource").filter((entry) => /\.woff2(?:\?|$)/.test(entry.name)).length,
          undersized: [...document.querySelectorAll<HTMLElement>("button,a[href],input")].filter(visible)
            .filter((element) => !element.hasAttribute("disabled"))
            .filter((element) => {
              const target = element.matches('input[type="checkbox"]') ? element.closest("label") ?? element : element;
              const rect = target.getBoundingClientRect();
              return rect.width < 44 || rect.height < 44;
            }).map((element) => ({ tag: element.tagName, role: element.getAttribute("aria-label") ?? element.textContent?.trim(),
              width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
        };
      });
      if (!twoFixesOnly) {
      expect.soft(metrics.overflow, `${state}/${theme}: document overflow`).toBe(false);
      expect.soft(metrics.headingFamily).toContain("Fraunces");
      expect.soft(metrics.bodyFamily).toContain("Source Sans 3");
      expect.soft(metrics.fonts.some((font) => font.includes("Fraunces"))).toBe(true);
      expect.soft(metrics.fonts.some((font) => font.includes("Source Sans 3"))).toBe(true);
      expect.soft(metrics.fontAssets).toBeGreaterThan(0);
      if (page.viewportSize()?.width === 390) expect.soft(metrics.undersized, `${state}/${theme}: 44px targets`).toEqual([]);
      }

      if (state === "confirmation") {
        const proof = await page.evaluate(() => {
          const style = getComputedStyle(document.querySelector(".action-confirmation .primary-button")!);
          const luminance = (color: string) => {
            const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
              const value = channel / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
          };
          const foreground = luminance(style.color);
          const background = luminance(style.backgroundColor);
          return {
            foreground: style.color, background: style.backgroundColor,
            ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
            homeHeight: document.querySelector('a[aria-label="AI Service Studio home"]')!.getBoundingClientRect().height,
          };
        });
        console.log(`TASK0009_TWO_FIX ${JSON.stringify({ width: page.viewportSize()?.width, theme, ...proof })}`);
        expect.soft(proof.ratio, `${theme}: confirmed Generate text contrast >=4.5`).toBeGreaterThanOrEqual(4.5);
        if (theme === "dark") expect.soft(proof.background).toBe("rgb(242, 138, 102)");
        if (page.viewportSize()?.width === 390) expect.soft(proof.homeHeight).toBeGreaterThanOrEqual(44);
      }
      if (twoFixesOnly) return;

      await page.locator("body").click({ position: { x: 2, y: 2 } });
      for (let index = 0; index < 30 && !(await toggle.evaluate((element) => element === document.activeElement)); index += 1) {
        await page.keyboard.press("Tab");
      }
      expect.soft(await toggle.evaluate((element) => {
        const style = getComputedStyle(element);
        return element === document.activeElement && element.matches(":focus-visible")
          && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      }), `${state}/${theme}: keyboard-visible theme focus`).toBe(true);

      await page.evaluate(axe.source);
      const scan = await page.evaluate(async () => {
        const results = await (window as unknown as { axe: typeof axe }).axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return {
          violations: results.violations.filter((item) => item.impact === "serious" || item.impact === "critical")
            .map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) })),
          contrastIncomplete: results.incomplete.filter((item) => item.id === "color-contrast")
            .flatMap((item) => item.nodes.map((node) => node.target)),
        };
      });
      expect.soft(scan.violations, `${state}/${theme}: serious/critical axe findings including contrast`).toEqual([]);
      // Diagnostic only: bound unknown gradient pixels over the entire sRGB
      // cube, then composite actual ancestor background colors above them.
      // A lower bound below the threshold is unknown, never a proven failure.
      const contrastBounds = await page.evaluate((targets) => {
        const rgba = (value: string) => {
          if (!/^rgba?\(/.test(value)) return null;
          const channels = value.match(/[\d.]+/g)?.map(Number);
          return channels && channels.length >= 3 ? [...channels.slice(0, 3), channels[3] ?? 1] : null;
        };
        const luminance = (rgb: number[]) => rgb.slice(0, 3).map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
        return targets.map((target) => {
          const selector = typeof target[0] === "string" ? target[0] : "";
          const element = selector ? document.querySelector<HTMLElement>(selector) : null;
          if (!element) return { selector, status: "unresolved_selector" };
          if (element.closest('[aria-hidden="true"]')) return { selector, status: "decorative_excluded" };
          const chain: HTMLElement[] = [];
          for (let node: HTMLElement | null = element; node; node = node.parentElement) chain.unshift(node);
          let low = [0, 0, 0];
          let high = [255, 255, 255];
          for (const node of chain) {
            const style = getComputedStyle(node);
            if (style.opacity !== "1" || style.filter !== "none" || style.mixBlendMode !== "normal"
              || style.boxShadow.includes("inset") || style.textShadow !== "none") {
              return { selector, status: "unresolved_paint_effect" };
            }
            if (["::before", "::after"].some((pseudo) => {
              const content = getComputedStyle(node, pseudo).content;
              return content !== "none" && content !== "normal";
            })) return { selector, status: "unresolved_pseudo_element" };
            // Blur can sample outside an ancestor's bounds; do not assume
            // previously composed ancestor colors constrain that backdrop.
            if (style.backdropFilter !== "none") { low = [0, 0, 0]; high = [255, 255, 255]; }
            const color = rgba(style.backgroundColor);
            if (!color) return { selector, status: "unresolved_color_format" };
            low = low.map((value, index) => color[index]! * color[3]! + value * (1 - color[3]!));
            high = high.map((value, index) => color[index]! * color[3]! + value * (1 - color[3]!));
            if (style.backgroundImage !== "none") { low = [0, 0, 0]; high = [255, 255, 255]; }
          }
          const style = getComputedStyle(element);
          const foreground = rgba(style.color);
          if (!foreground || foreground[3] !== 1) return { selector, status: "unresolved_foreground" };
          const light = luminance(foreground);
          const min = luminance(low);
          const max = luminance(high);
          const lowerBound = light < min ? (min + 0.05) / (light + 0.05)
            : light > max ? (light + 0.05) / (max + 0.05) : 1;
          const size = parseFloat(style.fontSize);
          const weight = parseFloat(style.fontWeight);
          const threshold = size >= 24 || (size >= 18.6667 && weight >= 700) ? 3 : 4.5;
          return { selector, foreground: style.color, size, weight, low, high, lowerBound, threshold,
            status: lowerBound >= threshold ? "bounded_pass" : "unresolved_bound" };
        });
      }, scan.contrastIncomplete);
      // Focused fallback for the four known unresolved selectors only. Capture
      // backgrounds with glyph fill hidden (not color/opacity/layout), then
      // compare original computed foreground against every text-box pixel.
      const preciseSelectors = [...new Set(contrastBounds.filter((row) => row.status.startsWith("unresolved"))
        .map((row) => row.selector))].filter((selector) => [".account-context", ".section-copy", "#workspace-heading", ".selected"].includes(selector));
      const textRuns = await page.evaluate((selectors) => selectors.flatMap((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const runs = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent?.trim() || !node.parentElement) continue;
          const style = getComputedStyle(node.parentElement);
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => ({ x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height }));
          runs.push({ selector, color: style.color, size: parseFloat(style.fontSize), weight: parseFloat(style.fontWeight), rects });
        }
        return runs;
      }), preciseSelectors);
      const backgroundImage = await page.screenshot({ fullPage: true, scale: "css",
        style: preciseSelectors.length ? `${preciseSelectors.join(",")} {-webkit-text-fill-color:transparent!important;text-shadow:none!important;}` : "" });
      const renderedContrast = await page.evaluate(async ({ data, runs }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, image.width, image.height).data;
        const luminance = (rgb: number[]) => rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
        return runs.map((run) => {
          const foreground = run.color.match(/[\d.]+/g)?.map(Number);
          if (!foreground || foreground.length !== 3 || image.width !== document.documentElement.scrollWidth) {
            return { selector: run.selector, status: "unresolved_measurement" };
          }
          const foregroundLight = luminance(foreground);
          let minRatio = Infinity;
          let samples = 0;
          for (const rect of run.rects) {
            if (rect.x < 0 || rect.y < 0 || Math.ceil(rect.x + rect.width) > image.width || Math.ceil(rect.y + rect.height) > image.height) {
              return { selector: run.selector, status: "unresolved_geometry" };
            }
            for (let y = Math.floor(rect.y); y < Math.ceil(rect.y + rect.height); y += 1) {
              for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.width); x += 1) {
                const offset = (y * image.width + x) * 4;
                const backgroundLight = luminance([pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!]);
                minRatio = Math.min(minRatio, (Math.max(foregroundLight, backgroundLight) + 0.05)
                  / (Math.min(foregroundLight, backgroundLight) + 0.05));
                samples += 1;
              }
            }
          }
          const threshold = run.size >= 24 || (run.size >= 18.6667 && run.weight >= 700) ? 3 : 4.5;
          return { selector: run.selector, foreground: run.color, size: run.size, weight: run.weight,
            rects: run.rects, samples, minRatio, threshold,
            status: samples > 0 && minRatio >= threshold ? "rendered_pass" : "unresolved_or_failing_measurement" };
        });
      }, { data: backgroundImage.toString("base64"), runs: textRuns });
      const contrastUnresolved = contrastBounds.filter((row) => {
        if (row.status === "bounded_pass" || row.status === "decorative_excluded") return false;
        const measured = renderedContrast.filter((item) => item.selector === row.selector);
        return measured.length === 0 || measured.some((item) => item.status !== "rendered_pass");
      });
      expect.soft(contrastUnresolved, `${state}/${theme}: every axe-incomplete text needs independent contrast proof`).toEqual([]);
      if (state === "confirmation" && theme === "light") {
        // Explicit capture of synthetic merchant UI only; no provider/login content.
        await page.screenshot({ path: test.info().outputPath("local-confirmation-light.png"), fullPage: true });
      }

      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "prefers-reduced-transparency", value: "reduce" },
      ] });
      await expect.poll(() => page.evaluate(() => {
        const surfaces = [...document.querySelectorAll<HTMLElement>(".glass-surface,.reading-surface")];
        return matchMedia("(prefers-reduced-transparency: reduce)").matches && surfaces.length > 0
          && surfaces.every((element) => {
            const style = getComputedStyle(element);
            return style.backdropFilter === "none" && /^rgb\(/.test(style.backgroundColor);
          });
      }), { timeout: 1_000, intervals: [25, 50, 100], message: `${state}/${theme}: opaque fallback must settle` }).toBe(true);
      const reduced = await page.evaluate(() => ({
        motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        transparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
        moving: [...document.querySelectorAll<HTMLElement>("body *")].filter((element) => element.getClientRects().length > 0)
          .filter((element) => {
            const style = getComputedStyle(element);
            return [...style.transitionDuration.split(","), ...style.animationDuration.split(",")].some((value) => parseFloat(value) > 0.001);
          }).length,
        glass: [...document.querySelectorAll<HTMLElement>(".glass-surface")].map((element) => ({
          blur: getComputedStyle(element).backdropFilter,
          background: getComputedStyle(element).backgroundColor,
        })),
      }));
      expect.soft(reduced.motion).toBe(true);
      expect.soft(reduced.transparency).toBe(true);
      expect.soft(reduced.moving, `${state}/${theme}: reduced motion`).toBe(0);
      expect.soft(reduced.glass.every((surface) => surface.blur === "none" && !surface.background.startsWith("rgba(")),
        `${state}/${theme}: opaque reduced-transparency surfaces ${JSON.stringify(reduced.glass)}`).toBe(true);
      const settling = await page.evaluate(async () => {
        const started = performance.now();
        const snapshots = [];
        for (let sample = 0; sample < 20; sample += 1) {
          const surfaces = [...document.querySelectorAll<HTMLElement>(".glass-surface,.reading-surface")].map((element) => {
            const style = getComputedStyle(element);
            return { classes: element.className, blur: style.backdropFilter, background: style.backgroundColor,
              transitionProperty: style.transitionProperty, transitionDuration: style.transitionDuration };
          });
          const settled = surfaces.every((surface) => surface.blur === "none" && !surface.background.startsWith("rgba("));
          snapshots.push({ elapsedMs: performance.now() - started, settled, surfaces });
          if (settled) break;
          await new Promise((done) => setTimeout(done, 25));
        }
        return { mediaMatches: matchMedia("(prefers-reduced-transparency: reduce)").matches, snapshots };
      });
      // Whitelisted synthetic CSS diagnostics only: no document text, tokens or network payloads.
      writeFileSync(test.info().outputPath(`diagnostic-${state}-${theme}.json`), JSON.stringify({
        state, theme, width: page.viewportSize()?.width, contrastBounds, renderedContrast, contrastUnresolved, reducedInitial: reduced, settling,
      }, null, 2));
      await cdp.send("Emulation.setEmulatedMedia", { features: [] });
      await cdp.detach();
    });
  }
}

for (const scope of ["matrix", "two-fixes"] as const) {
test(`TC-0012 local synthetic review to usage return; no provider proof; ${scope}`, async ({ page, context }) => {
  test.setTimeout(120_000);
  let active = false;
  let generated = false;
  let activationCalls = 0;
  let usageCalls = 0;
  let unexpectedNetwork = 0;
  let summary: AccountUsageSummary = {
    tier: "go", allowance: { granted: 100, reserved: 0, committed: 0, available: 100 },
    resetsAt: "2027-08-15T19:00:00.000Z", operations: [],
  };
  await context.routeWebSocket("**", (socket) => socket.close());
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { unexpectedNetwork += 1; return route.abort(); }
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/quotes") return reply({
      intentId: "11111111-1111-4111-8111-111111111111", quoteId: "22222222-2222-4222-8222-222222222222",
      tier: "go", cadence: "monthly", base: { currency: "USD", cents: 1000 },
      promotion: { currency: "USD", cents: -500 }, taxableSubtotal: { currency: "USD", cents: 500 },
      taxBasisPoints: 1055, tax: { currency: "USD", cents: 53 }, dueToday: { currency: "USD", cents: 553 },
      expiresAt: "2027-07-15T19:15:00.000Z", renewsAt: "2027-08-15T19:00:00.000Z", allowanceResetsAt: "2027-08-15T19:00:00.000Z",
      timeZone: "America/Los_Angeles", pricingVersion: "go-monthly-intro-v1", taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
    });
    if (url.pathname === "/api/v1/me/summary") return active ? reply(summary) : reply({ error: { code: "not_found" } }, 404);
    if (url.pathname === "/api/v1/me/activation") {
      activationCalls += 1; active = true; return reply(summary);
    }
    if (url.pathname === "/api/v1/usage/generate-answer") {
      usageCalls += 1;
      const input = route.request().postDataJSON();
      expect(input).toMatchObject({ promptKey: "renewal-recovery", confirmed: true });
      summary = { ...summary, allowance: { granted: 100, reserved: 0, committed: 10, available: 90 }, operations: [{
        clientOperationId: input.clientOperationId, allowanceWindowId: "33333333-3333-4333-8333-333333333333",
        action: "generate-answer", fixtureKey: "renewal-recovery", units: 10, state: "committed", fundingSource: "PayPal Wallet",
        reservedAt: "2026-09-27T00:00:00.000Z", completedAt: "2026-09-27T00:00:01.000Z",
      }] };
      generated = true;
      return reply({ state: "committed", summary, answer: { label: "Simulated AI", title: "Renewal recovery playbook", body: ["Synthetic local fixture result."] } });
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/webhooks")) {
      unexpectedNetwork += 1; return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    localStorage.setItem("sb-127-auth-token", JSON.stringify({
      access_token: "synthetic-nonreusable", refresh_token: "synthetic-nonreusable", expires_at: 4102444800,
      expires_in: 86400, token_type: "bearer", user: { id: "fixture", aud: "authenticated", role: "authenticated" },
    }));
  });
  await page.goto(`${origin}/checkout/11111111-1111-4111-8111-111111111111`);
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await expect(page.getByText("$5.53", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Save my PayPal Wallet for future recurring Go payments.")).not.toBeChecked();
  expect(activationCalls).toBe(0);
  if (scope === "matrix") await auditLocalState(page, "review");
  // Explicit synthetic handoff: no SDK, provider click, capture or payment occurs.
  await page.goto(`${origin}/workspace`);
  await expect(page.getByRole("heading", { name: "#Generate Answer" })).toBeVisible();
  if (scope === "matrix") await auditLocalState(page, "active100");
  await page.getByRole("button", { name: "How can an AI SaaS reduce failed-renewal churn?" }).click();
  await expect(page.getByText("90 units after success")).toBeVisible();
  expect(usageCalls).toBe(0);
  await auditLocalState(page, "confirmation", scope === "two-fixes");
  await page.getByRole("button", { name: "Generate · 10 units" }).click();
  await expect(page.getByRole("heading", { name: "Renewal recovery playbook" })).toBeVisible();
  expect(generated).toBe(true);
  // React StrictMode may invoke initial activation twice. This fixture cannot
  // prove server idempotency; assert only that return consumes existing state.
  const initialActivationCalls = activationCalls;
  expect(initialActivationCalls).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Renewal recovery playbook" })).toBeVisible();
  expect(activationCalls).toBe(initialActivationCalls);
  await expect(page.getByText("90 units available", { exact: true })).toBeAttached();
  expect(usageCalls).toBe(1);
  if (scope === "matrix") await auditLocalState(page, "return90");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(unexpectedNetwork).toBe(0);
});
}
