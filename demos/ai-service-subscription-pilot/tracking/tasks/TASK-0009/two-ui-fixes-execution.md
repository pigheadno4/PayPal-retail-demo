# TASK-0009: two approved UI corrections

- status: `needs_review`; two-fix scope verified, not AC4/full-task acceptance.
- Authority: `user:TASK-0009:2026-09-27:two-ui-fixes-approved`, role 11, `ui-fix-authorization.md`.
- Candidate commit: none; no commit/push/deploy authorized or performed.
- Files changed this increment: `web/src/styles.css`, `tests/e2e/hosted-slice.spec.ts`, this report. Prior reports and loop controls untouched.
- Existing approved visual design reused. Executor/TDD applied. UI/UX Pro Max instructions inspected; its design-system retrieval command failed because the system Python requires Xcode license acceptance. No setup or license change attempted; existing approved contracts remain the authority, with no redesign or new design system.

## Before snapshot and exact incremental CSS

Before CSS SHA-256: `716afa3d5155bceaa2f1129c0351055d317b31dfbd91408ccbb16c990a676329`.

Read-only `git diff -- web/src/styles.css` before changes showed only the existing seven-line `.total-equation` addition (margin, muted foreground, font size, line height). That existing user-owned block remains byte-for-byte unchanged. This task adds only these two rules, no global token changes:

```css
:root[data-theme="light"] .action-confirmation .primary-button {
  background: #b34f30;
}

/* Inside the existing max-width: 720px media block */
.brand {
  min-height: 44px;
}
```

The first rule is limited to the light-themed Generate confirmation action. The existing HeaderControls supplies the explicit theme attribute. Other primary buttons and all dark-theme colors remain unchanged. The second increases the mobile anchor hit area, not its 38px brand mark; desktop geometry is unchanged.

## Red → green evidence

The previous matrix's confirmed failures provided initial red evidence. Added direct WCAG luminance-ratio and hit-height assertions, then ran them before the CSS correction against the mobile fixture:

| Check | Before | After |
| --- | --- | --- |
| Light Generate foreground | `rgb(255,248,241)` | unchanged |
| Light Generate background | `rgb(199,91,57)` | `rgb(179,79,48)` |
| Light Generate contrast | **4.0026848988:1**, fails 4.5 | **4.8921149705:1**, passes |
| Dark Generate contrast | **7.0438548177:1** | **7.0438548177:1**, unchanged |
| Mobile home anchor height | **38px**, fails 44 | **44px**, passes in both themes |
| Laptop home anchor height | historical 38px | **38px**, unchanged |

Direct ratio calculation uses actual browser-computed opaque colors and WCAG sRGB luminance, independent of the CSS value. The original matrix keeps the axe checks including its `color-contrast` rule. A separate `two-fixes` test variant runs only these focused assertions plus the existing synthetic journey; it does **not** downgrade, remove or skip the matrix variant's assertions. This gives an honest focused green result without representing incomplete/manual contrast or reduced-transparency gaps as passed.

Commands run from the demo directory (local listener/browser execution required approved sandbox escalation):

1. RED: `env -u DATABASE_URL -u PLAYWRIGHT_BASE_URL -u TASK0009_BASE_URL npm run test:e2e -- --config=playwright.task0009.config.ts --project=local-390` before CSS changes: **1 failed**, including light ratio and mobile height assertions. Dark ratio passed. Existing manual-contrast gaps also remained red.
2. GREEN: same isolated command with `--grep two-fixes` instead of `--project=local-390`: **2 passed**, laptop and exact 390px, both light/dark. Captured all four normalized ratio/height observations above. Command output was filtered to diagnostic records and error/pass summaries; shell `pipefail` preserved failing exit codes.
3. `npm run typecheck`: **passed**. `npm run lint`: **passed**. `git diff --check`: **passed**.

No further broad suite/build/database check run. No new screenshot claimed for the fixed candidate. Prior screenshots remain historical pre-fix evidence.

## Review candidate hashes

| File | SHA-256 |
| --- | --- |
| `web/src/styles.css` | `501164fd4d387e6cdaaa5d30efc07c9d44895ce61e0d83e3d93583b2037ac0b5` |
| `tests/e2e/hosted-slice.spec.ts` | `21ec9728d7eb65844444af4e63f5b44ad36c06fa4de8cc3210342fef5b20b2d0` |

Before this increment the spec hash was `bf71c7c1802fad6a365141b1810b8e61ff9790b38b8752077f176f8a9c10032b`. Unchanged task config/sanitizer hashes remain recorded in `local-visual-execution.md`.

## Remaining boundaries

Only the two approved defects are verified corrected. Full matrix was not rerun after correction and is not reported green. Gradient/glass contrast still requires manual review; initial reduced-transparency behavior remains unresolved. No provider hydration, hosted identity/payment, external database or real backend persistence evidence was added. EVID-0006 stays partial; Resend contained failure remains skipped, not passed. No payment, identity, allowance or usage semantics changed.

Independent spec and quality review remain required. Rollback removes the two added CSS rules and this increment's test changes only, retaining the existing `.total-equation` block, original matrix, and all unrelated user changes.
