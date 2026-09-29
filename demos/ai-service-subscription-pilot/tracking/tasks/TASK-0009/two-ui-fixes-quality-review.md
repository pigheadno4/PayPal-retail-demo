# TASK-0009 two UI fixes — independent quality review

- Lane: `quality`; mode: `scoped` continuation; reviewer `/root/task0009_local_quality`, role 13 of cap15.
- Local verdict: **approved**, zero Critical, Important or Minor findings within the two authorized corrections and focused test increment.
- Authority: `ui-fix-authorization.md`, `user:TASK-0009:2026-09-27:two-ui-fixes-approved`.
- Base commit: `5239e79f4d1b4aa557566ac9699ac34bf07d3359`; candidate commit: **none; commits remain unauthorized**. This exact-file-hash review is not final same-candidate-commit approval or full AC4 acceptance.

## Exact candidate and inputs

Independently recomputed hashes match the executor and specification receipts:

| File | SHA-256 |
| --- | --- |
| `web/src/styles.css` | `501164fd4d387e6cdaaa5d30efc07c9d44895ce61e0d83e3d93583b2037ac0b5` |
| `tests/e2e/hosted-slice.spec.ts` | `21ec9728d7eb65844444af4e63f5b44ad36c06fa4de8cc3210342fef5b20b2d0` |

Read the authorization, `two-ui-fixes-execution.md` and `two-ui-fixes-spec-review.md`; inspected the CSS diff and focused test increment against the previously reviewed browser source. Previous browser hash: `bf71c7c1802fad6a365141b1810b8e61ff9790b38b8752077f176f8a9c10032b`. The recorded CSS baseline is `716afa3d5155bceaa2f1129c0351055d317b31dfbd91408ccbb16c990a676329`; the specification reviewer independently reconstructed that baseline by removing only the two additions. This quality lane inspected that receipt and the diff, and did not independently repeat the reconstruction.

## Correctness, regression and isolation assessment

- Light confirmation contrast: the rule selects only an explicitly light-themed `.action-confirmation .primary-button`, leaving global tokens, other primary buttons and dark styling untouched. The focused test derives contrast from computed foreground/background using the sRGB luminance formula, rather than treating the CSS literal as proof. For the currently opaque RGB colors, the calculation correctly checks the 4.5:1 threshold. The executor reports 4.0027:1 before and 4.8921:1 after; dark stays 7.0439:1 and its background is explicitly asserted unchanged.
- Mobile home target: `min-height: 44px` is confined to `.brand` in the existing max-width 720px media query. The actual anchor, not just its icon, is measured by the test. The 38px brand mark and desktop rules are unchanged; reported mobile anchor height is 44px in both themes, while laptop remains 38px. No application behavior changes are introduced.
- Regression scope: the CSS diff contains the two authorized additions plus the identified pre-existing `.total-equation` block; that block is outside this increment and not credited as new work. No architecture, interface, authentication, payment, allowance or usage semantics changed.
- Test integrity: the named `two-fixes` variant performs focused confirmation checks in light/dark and keeps the existing synthetic review, usage and reload assertions. The separate `matrix` variant still executes the earlier axe, contrast-incomplete, font, target, keyboard and reduced-preference assertions. Filtering for `two-fixes` is honestly reported as focused evidence, not a green complete matrix. Diagnostics contain only computed colors, ratio, viewport and anchor height.
- Isolation: the existing fixed-loopback Vite configuration, synthetic session, external/unknown API blocking, websocket/service-worker restrictions and no-hosted proof labels remain unchanged. The new calculations and variant do not introduce external calls or privileged operations.

## Evidence, findings and verdict boundary

Reviewed executor red/green, typecheck, lint and diff-check receipts. The coordinator separately reports a fresh two-browser focused pass with light contrast 4.8921:1, mobile home height 44px and dark contrast 7.0439:1. Those runtime results are supplied evidence, not reruns by this reviewer. This lane performed only source/hash inspection and wrote this report; no browser, broad suite, provider/web request, OTP, database operation, production edit or commit occurred.

Prior two confirmed application findings: locally corrected with adequate focused evidence. New actionable quality findings: none. No escalation beyond this bounded review is required.

Full AC4/TC-0011 is **not passed**. Glass/gradient contrast still needs manual evaluation, reduced-transparency behavior remains unresolved, and the full post-fix matrix was not rerun. No fresh fixed-candidate screenshot or full visual-fidelity verdict is claimed. Hosted/provider/identity evidence gaps and full TASK-0009/TC-0012, EVID-0005 and SLICE-001 acceptance remain open. EVID-0006 remains partial; Resend failure remains skipped, not run and not passed. Final candidate review and user acceptance remain separate; this approval authorizes no commit, deployment or push.
