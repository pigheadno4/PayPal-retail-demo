# TASK-0009 focused accessibility follow-up — specification review

- Lane: `spec`; mode: `scoped`; independent reviewer `/root/task0009_local_spec`, role18 of approved cap19.
- Verdict: **approved for this exact local test/evidence increment**, zero Critical, Important or Minor specification findings. This is not full AC4 or TASK-0009 acceptance.
- Authority: `accessibility-cap19-authorization.md`, `user:TASK-0009:2026-09-27:accessibility-cap19-approved`.
- Base commit: `5239e79f4d1b4aa557566ac9699ac34bf07d3359`; candidate commit: **none**. Final same-candidate-commit acceptance remains unavailable.

## Exact candidate

Independently recomputed and matched all dispatched hashes:

| File | SHA-256 |
| --- | --- |
| `tests/e2e/hosted-slice.spec.ts` | `6cfef6747b87e63b54e0f1dd24fe466ceebfddfe5e7542376a3d8f989bcc75d3` |
| `web/src/styles.css` — unchanged | `501164fd4d387e6cdaaa5d30efc07c9d44895ce61e0d83e3d93583b2037ac0b5` |
| `tracking/tasks/TASK-0009/accessibility-followup-execution.md` | `ce5e840299cc4fb29c602f6862ffc46f3fdf231ba1156a0a2a5dd06e297be73f` |

Prior spec: `9cf5f41ce3ed3aa82d662279cfd7f349f92b3c6a5048782eb65d01cc44e8739b`, reviewed in `remaining-accessibility-spec-review.md`.

## Review assessment

Read authorization, execution report and changed source; compared with the previously reviewed diagnostic source and TC-0011/local scope. Checked unchanged CSS hash and relevant text styling. No runtime rerun, browser activity, network or production edits occurred. The reported two passing matrix projects, 16 combinations, 36 rendered-proof occurrences and minimum6.0093:1 are reviewed executor results, not independently repeated measurements.

- Replacing the blanket axe-incomplete failure is justified by the authorized additional proof, not by ignoring unknowns. Actual serious/critical axe violations still fail independently. An incomplete nondecorative selector must have a conservative bounded pass or nonempty rendered measurements with every run passing; unknown selectors outside the four-item allowlist, missing runs, invalid geometry, unsupported measured foreground shape and insufficient contrast remain failures.
- The focused fallback measures the original computed foreground against every background pixel within its text-run rectangles, checks image/document width and bounds, and requires samples. This avoids cherry-picking a nearby background or using antialiased text as background. It is defensible for the four current static selectors and unchanged styles, not a general guarantee for future opacity/filter/overlay/font-color changes.
- Screenshot-only styling suppresses glyph fill and additionally sets `text-shadow:none`; inspected production CSS contains no text-shadow declaration. This does not change the current page's layout, backgrounds or production source. The image remains in memory, and original measurements/dispositions remain available in local diagnostics. The scoped method should not be described as validation of arbitrary future paint effects.
- Observable reduced-transparency polling is bounded to one second, requires a matching media query and nonempty surfaces, and checks all glass/reading surfaces for opaque RGB/no blur. A permanently transparent or missing surface fails; this is synchronization with the required state, not removal of the fallback requirement. Post-wait reduced-motion/fallback assertions remain.
- Previously accepted two CSS fixes and local synthetic isolation are preserved. No new product, payment, account or allowance behavior is introduced. The unchanged CSS hash also retains all previously verified user-owned CSS bytes.

## Disposition and limits

Prior contrast unknowns are resolved only for the reported four-state, two-theme, two-viewport fixture matrix by the supplied measurements. Prior timing-sensitive transparency check now waits for observable state under a finite failure deadline. No new specification findings or broader work requested.

Independent quality review remains role19, then the approved cap requires stopping further dispatch. Local matrix green does not close full keyboard/screen-reader coverage, every exception/loading/failure state, hydrated provider surfaces, hosted identity/payment/delayed-webhook proof, immutable EVID-0005, TC-0011/TC-0012, full TASK-0009 or SLICE-001. EVID-0006 remains partial; Resend failure remains skipped, not run and not passed. Final commit-based reviews and user acceptance remain separate; no commit, push or deployment is authorized here.
