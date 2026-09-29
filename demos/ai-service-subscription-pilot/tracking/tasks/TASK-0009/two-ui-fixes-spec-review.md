# TASK-0009 two UI fixes — independent specification review

- Lane: `spec`; mode: `scoped`; reviewer `/root/task0009_local_spec`, role 12 of cap15.
- Local verdict: **approved**, zero Critical, Important or Minor findings in the authorized two-fix increment. This is not AC4 or full TASK-0009 acceptance.
- Authority: `ui-fix-authorization.md`, `user:TASK-0009:2026-09-27:two-ui-fixes-approved`.
- Base commit: `5239e79f4d1b4aa557566ac9699ac34bf07d3359`. Candidate commit: **none; commits remain unauthorized**. Approval is bound only to the exact local candidate below, not a clean whole-application commit.

## Exact reviewed candidate

Independently recomputed SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `web/src/styles.css` | `501164fd4d387e6cdaaa5d30efc07c9d44895ce61e0d83e3d93583b2037ac0b5` |
| `tests/e2e/hosted-slice.spec.ts` | `21ec9728d7eb65844444af4e63f5b44ad36c06fa4de8cc3210342fef5b20b2d0` |

Previous browser-spec candidate: `bf71c7c1802fad6a365141b1810b8e61ff9790b38b8752077f176f8a9c10032b`, reviewed in `local-visual-spec-review.md`. Previous CSS snapshot recorded by executor: `716afa3d5155bceaa2f1129c0351055d317b31dfbd91408ccbb16c990a676329`. Independently removing only the two stated additions in memory reproduces that exact CSS hash. This verifies preservation of the pre-existing seven-line `.total-equation` block and other prior CSS bytes; no file was changed by that check.

## Inputs, checks and findings dispositions

Read authorization and `two-ui-fixes-execution.md`; inspected CSS diff and the browser test increment against the previously reviewed source, TC-0011 and approved mobile-target/contrast design requirements. Reviewed recorded red/green, typecheck, lint and diff-check results; no tests were rerun by this reviewer.

- Light Generate contrast: the theme- and component-scoped background rule addresses exactly the approved confirmation-button defect. No global token, dark-theme or unrelated primary-button change is introduced. Recorded computed contrast improves from 4.0027:1 to 4.8921:1; focused tests require at least 4.5:1. Dark background is independently asserted unchanged and its recorded ratio remains 7.0439:1.
- Mobile home link: `.brand` receives only `min-height: 44px` within the existing mobile media query. This expands the hit area without changing the 38px brand mark or desktop rule. Recorded mobile height is 44px in both themes, while laptop stays 38px. The focused mobile assertion checks the actual anchor height.
- Test scope remains honest: the additional named `two-fixes` variant checks the two corrections plus the existing synthetic journey. The separate `matrix` variant retains prior axe, manual-contrast-gap, fonts, target, focus and reduced-preference checks. Selective focused green does not mask or relabel the unresolved matrix.
- No provider, identity, payment, allowance or usage semantics are changed. No redesign or new dependency/configuration is introduced by this increment.

Evidence is bounded: executor reports two focused browser passes covering laptop/390px and light/dark, with typecheck and lint passed. The complete matrix was not rerun after these changes, and no fresh visual screenshot or full design-fidelity verdict is claimed. Independent reviewer actions were source/hash inspection and this report only, without browser/live requests, database operations, production edits or commits.

## Verdict boundary

The two approved application findings are locally corrected and their focused verification is adequate for this increment. Prior review's incomplete glass/gradient contrast and unresolved reduced-transparency observation remain open; they are neither corrected nor passed by this verdict. No new findings and no escalation beyond the authorized scope are required.

Independent quality review remains separate. Full AC4/TC-0011, TASK-0009/TC-0012, EVID-0005 and SLICE-001 acceptance remain pending, including complete visual/accessibility and hosted/provider evidence, final reviews on one authorized candidate commit and user acceptance. EVID-0006 stays partial; Resend failure remains skipped, not run and not passed. No deployment, commit or push is authorized here.
