# TASK-0009 focused accessibility follow-up

- status: `needs_review`; local four-state matrix passes, not full AC4/TASK-0009 acceptance.
- Approval: `user:TASK-0009:2026-09-27:accessibility-cap19-approved`, executor17; independent reviews18/19 reserved.
- Changes: `tests/e2e/hosted-slice.spec.ts` and this report only. No production changes, external traffic, OTP, payment, database, environment-file reads, commits, pushes or deployment.
- Before spec: `9cf5f41ce3ed3aa82d662279cfd7f349f92b3c6a5048782eb65d01cc44e8739b`.
- Frozen spec: `6cfef6747b87e63b54e0f1dd24fe466ceebfddfe5e7542376a3d8f989bcc75d3`.
- Production CSS unchanged: `501164fd4d387e6cdaaa5d30efc07c9d44895ce61e0d83e3d93583b2037ac0b5`.

## Exact change and evidence method

### Reduced transparency

Replace the two-animation-frame assumption with `expect.poll` for the observable invariant: reduced-transparency media query matches, at least one glass/reading surface exists, and **every** such surface has no backdrop filter and an opaque computed RGB background. Maximum wait1second, polling25/50/100ms. Timeout fails; the existing post-wait fallback and reduced-motion assertions are retained. This tests the verified eventual style state without accepting a permanently transparent fallback.

### Four known contrast selectors only

The existing conservative alpha-compositing bounds remain. The new fallback is restricted to `.account-context`, `.section-copy`, `#workspace-heading`, and `.selected`. No general paint engine or new dependency was introduced.

For these remaining unknowns:

1. Read original computed text foreground, font size/weight, and document-coordinate `Range.getClientRects()` for each nonempty text node.
2. Capture the actual rendered full-page background at CSS-pixel scale, temporarily hiding **glyph fill only** through screenshot-scoped `-webkit-text-fill-color:transparent`. CSS `color`, opacity, borders, layout, gradients, blur and pseudo-element geometry are unchanged. The temporary screenshot style is automatically removed. This avoids sampling text antialiasing or using the foreground pixel as its own background.
3. Decode the PNG into an in-browser canvas, verify image/document width agreement and text-box bounds, then compare the original foreground to **every** background pixel inside each text rectangle. Minimum WCAG sRGB contrast over those pixels is the result; no cherry-picked neighboring pixel or visual guess is used.
4. Require nonempty measurements, valid opaque RGB foreground and threshold4.5 for normal text or3 for sufficiently large/bold text. Missing selectors/runs, unsupported geometry or insufficient measurements stay unresolved. Every formerly incomplete nondecorative selector must either retain its proven conservative bound or have all measured runs pass.

The prior blanket `axe incomplete == []` assertion is replaced by this **proof-required unresolved list == []** assertion. Axe's actual serious/critical violation gate remains unchanged. Incomplete nodes are not blindly ignored; their original selectors and both independent proof types remain in the diagnostic receipts. Screenshots used for pixel sampling remain in memory and are not published as user screenshots.

This is evidence for the actual static synthetic states at the tested sizes/themes, not every possible text, animation, resize, overlay, browser or future style. It assumes the screenshot-scaled document geometry and original computed RGB values, with no production styling changes.

## Measured result

All four existing states (review, active100, confirmation, return90), light/dark, laptop1440 and mobile390: **16 combinations** completed. The270 conservative-bound passes and8 decorative exclusions remain; all36 previously unknown selector occurrences obtained rendered proof.

| Previously unresolved text | Minimum light ratio | Minimum dark ratio |
| --- | ---: | ---: |
| Desktop account context | 6.0464:1 | 7.6463:1 |
| Workspace supporting copy | 6.0093:1 | 7.6205:1 |
| Workspace heading/pseudo decoration | 7.8689:1 | 10.5081:1 |
| Selected prompt/inset styling | 14.2268:1 | 14.5618:1 |

All exceed4.5:1 without relying on the large-text exception. Text rectangles sampled approximately1,738 pixels for the account label,2,480 for the heading,16,997–17,043 for supporting copy, and7,475–7,544 for the selected prompt. No unresolved selector remained in any of the16 receipts. Reduced transparency reached the asserted opaque/no-blur state in all16 combinations. Existing two-fix measurements remained4.8921:1 light Generate,7.0439:1 dark Generate and44px mobile home target.

Receipts: each matrix test directory below `test-results/task0009-local/` contains `diagnostic-<state>-<theme>.json` with allowlisted computed styles, original unresolved selectors, text rectangles, pixel counts, minimum ratios, thresholds, resolved/unresolved disposition and fallback state. These generated local files may be overwritten by later runs; they are not immutable hosted EVID-0005 proof. They contain no raw identity/provider data.

## Red/green and checks

- RED baseline: the exact preceding spec hash above produced2failed matrix scenarios in `remaining-accessibility-execution.md`: axe incomplete text and an early transparency sample. The user explicitly approved correcting these test/evidence limitations; no production defect was silently fixed.
- GREEN single bounded pass: `env -u DATABASE_URL -u PLAYWRIGHT_BASE_URL -u TASK0009_BASE_URL npm run test:e2e -- --config=playwright.task0009.config.ts --grep matrix` → **2passed in9.6s**, all16 state/theme/viewport combinations. Approved sandbox escalation allowed the fixed loopback listener/browser only. Output filtering retained exit code via `pipefail`.
- `npm run typecheck` → passed. `npm run lint` → passed. `git diff --check` → passed.
- No broad suite/build/DB rerun and no further refinement iteration.

## Boundaries and handoff

No claim of full keyboard traversal/screen-reader coverage, all page-contract exception states, loading/reservation/failure states, provider hydration, actual funding, hosted identity, full EVID-0005 or full slice acceptance. EVID-0006 remains partial; Resend contained failure stays skipped, not passed. Independent reviews18/19 must assess this precise evidence method and exact hashes. No candidate commit was authorized.

Rollback only this spec increment/report, preserving approved CSS fixes, previous diagnostic instrumentation and all unrelated dirty files. Files frozen after the single focused run.
