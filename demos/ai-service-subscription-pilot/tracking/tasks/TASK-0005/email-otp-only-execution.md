# Email-OTP-only implementation — executor67

- Status: `blocked` at the explicit candidate-construction/staging gate; implementation and working-tree local verification are ready for handoff, not accepted or independently reviewed.
- Date: 2026-09-19. Approved five-AC plan SHA-256 `94ff7f34025e30d59fd20a8fe15a37475baa6d09cb178de632654390d509e3c8`; critic66 approved; coordinator/user detailed-plan approval confirmed in loop-state. Cap69.
- Candidate commit: **none**. Workspace HEAD remains `5239e79f4d1b4aa557566ac9699ac34bf07d3359`. No staging, commit, push, deployment, hosted OTP, live provider/DB request, deletion or control-file edit.

## Attributable implementation

Runtime edits are exactly the three approved files: `web/src/components/checkout/identity-panel.tsx`, `web/src/routes/checkout.tsx`, `web/src/routes/home.tsx`. Removed temporary route/alias/reveal wiring; the form always sends `{intentId, identityRoute: "persistent", email}`. Existing email OTP verification, token restoration, same-intent resume, refresh, stale quote replacement, safe messages and busy controls remain. No CSS, API client, server, shared contract, schema, configuration or payment component changed.

Test/evidence changes: home and checkout static tests cover six identity states; local browser fixtures block unmatched API/external requests and assert payloads, same intent, review/refresh/stale behavior, unchecked consent, no payment/activation/usage/temporary calls and request/verify busy/error recovery. TC-0003 body remains statically skipped with the dated amendment reason. New `tests/evidence/task0005-email-only.test.ts` implements the explicitly planned structural guards; it does not substitute for browser or hosted proof.

The hosted harness now discovers only persistent TC-0014, keeps readiness/isolation/manual inbox/resume/refresh/non-mutation/privacy guards and forbids demo-session endpoints. Temporary helpers/execution were removed from this current acceptance source; prior reports and source preimage remain intact. The current request diagnostic labels are retained; historical expiry diagnostic helpers/tests are untouched.

`validateTask0005Manifest` defaults to the original strict `legacy_full` 19-record contract. Explicit `persistent_email` requires the exact 11-record contract and one contained-failure case; wrong scope, missing, extra, temporary, duplicate, private rows and invalid failure counts reject. Future captures use `manifest-email-otp-only.json` and `persistent-review-email-otp-only.png`; old captures are not overwritten or reduced in scope. No manifest was generated.

The 12 named derived documents received only a dated current-scope override (plus the required filename/scope map in `tracking/evidence.md`). Historical text/results remain intact. TC-0003/0015 temporary acceptance is deferred, not passed; persistent resume/refresh/non-mutation belongs to TC-0014. Unresolved expiry history and separate hosted/payment gates remain explicit.

## Test-first / local verification

Commands ran from the demo directory using a clean process environment (`env -i`, only standard PATH/HOME and non-secret test flags), except the build/browser commands which ran in the env-free temporary source mirror described below.

| Check | Observed result |
| --- | --- |
| RED focused home/checkout/sanitizer/email-only/baseline tests | 11 expected failures, 50 passed: old temporary UI, old manifest scope and old hosted/local selection |
| GREEN same five files | 61 passed |
| Retained auth/service/OTP timing/identity/hook/middleware suite | 35 passed after local socket permission |
| Full `npm test -- --silent` | 441 passed, 8 environment-gated DB tests skipped; 39 files passed, 3 skipped |
| `npm run typecheck` | Passed all root/server/web checks |
| `npm run lint` | Passed |
| `npm run build` in safe mirror | Passed server and web build; fake public values only |
| Local identity-and-quote browser suite | 12 passed, 2 skipped (TC-0003 in both projects), 15.5s |
| Hosted `--list` only | One test: `TC-0014 hosted persistent email identity only`; not executed |
| `git diff --check` | Passed |
| Reverse patch applicability check | Passed; no reversal performed |

Initial sandbox execution could not bind local sockets: retained suite had 13 route failures and the full suite 54 infrastructure failures (`listen EPERM`); browser webServer exited before tests. These were not assertion regressions. With narrowly approved local-listener/browser permissions and the same clean environment, the retained/full/browser checks passed. No backend change was made to address the sandbox restriction.

The browser command used the approved fake public values and known local Chrome executable, `CI=1` to prohibit unrelated server reuse, `--workers=1`, the existing `playwright.config.ts`, the exact `identity-and-quote.spec.ts`, `--grep-invert '@hosted'`, and output `/private/tmp/task0005-email67.JzQXcS/browser-results`. Port3000 had no listener before startup. The test-created server/browser were closed by the runner. Unmatched API/external requests were aborted before reaching a provider or database. Supabase verification was fixture interception, not a real OTP.

## Safe build and visual proof

Because the existing Vite config calls `loadEnv`, builds/browser execution used `/private/tmp/task0005-email67.JzQXcS/local-build`, a temporary copy of the exact relevant working source/config/package files with `.env*` excluded and installed dependencies symlinked. Repository config and private environment files were not changed or printed. Only fake Vite values were supplied. This is a working-source verification mirror, **not an isolated committed candidate**; it does not satisfy the later same-commit gate.

Fixture screenshots remain in `/private/tmp/task0005-email-only-local/`, never historical EVID paths. Visually inspected `entry`, `code`, `request-error`, and `review` for each of `chromium-light`, `chromium-dark`, `mobile-chromium-light`, `mobile-chromium-dark` (16 images), plus representative request/verify busy and verify-error images. Mobile viewport was exactly390×844 CSS pixels (device-scaled screenshot width differs); desktop used the existing Desktop Chrome viewport. Email/code values shown are synthetic `.test`/fixture values only.

Inspection found retained C3-G typography/surfaces, readable labels/status/error text, visible keyboard focus rings, no temporary controls, and no overlap/cropped controls. Automated checks confirmed input-to-submit keyboard order, visible disabled busy actions, no horizontal overflow, and minimum44px action targets; checkbox measurement uses its actual clickable label. Review retains the exact $5.53 fixture amount and unchecked consent without loading payment UI. No broader visual redesign or provider/accessibility certification is claimed.

Example local views: [desktop light entry](/private/tmp/task0005-email-only-local/chromium-light-entry.png), [desktop dark code](/private/tmp/task0005-email-only-local/chromium-dark-code.png), [390px light error](/private/tmp/task0005-email-only-local/mobile-chromium-light-request-error.png), [390px dark review](/private/tmp/task0005-email-only-local/mobile-chromium-dark-review.png).

## Exact patch and preservation receipt

At start, captured 449 existing tracked/untracked demo files (excluding environment files), an empty index receipt and mode0600 preimages of the 21 intended existing files. At handoff, **all428 protected files match their starting SHA-256 and the index remains unchanged/empty**. This includes retained backend/security/source/config paths, REQUIREMENTS, historical task reports and old evidence/captures. Only the 21 named existing files, new structural test and this new report were written in the repository.

Artifacts under `/private/tmp/task0005-email67.JzQXcS/`:

- `baseline.json`: `21c7a28d28ce4f56593d4a0fed949e1b6b2f8711f2491ad900cbeb7d7646f028`.
- `before/`: exact mode0600 preimages of all21 edited existing files; `status-before.txt` and `index-before.txt` record starting git state.
- `receipt.json`: `e586e96dd854760fe07fa549b4fe1cc5afa27ad5ca472f677d33e917b868274b`; exact per-file before/after hashes, the new-test hash, protected comparison and selected deployment dependency checks.
- `amendment.patch`: `91b1be67de0d99c01aadd81c0f55d158219cd7a8f8c236c5fc165d50bb6cf660`; exact task-only unified hunks for21 existing files plus the new structural test (22 files). This newly written execution report is a separate new file, not self-included in that patch.

`git apply --reverse --check /private/tmp/task0005-email67.JzQXcS/amendment.patch` passed. Rollback, only if authorized, reverses these hunks/new files against their captured baseline; never restore dirty files wholesale to HEAD or remove pre-existing changes.

## Candidate-construction gate / next owner

The coordinator must obtain explicit staging/commit authority for the exact task hunks and any required baseline dependencies. The current root has significant pre-existing untracked/dirty content, so whole-file staging is not equivalent to staging this task.

A cheap read-only comparison against known deployment commit `5b25cd06` found:

- `tests/evidence/task0005-readiness.ts`, its test, `task0005-allowance-baseline.ts`, its test, and canonical `REQUIREMENTS.md` are absent there. The persistent harness imports the readiness/allowance helpers; their inclusion and approved governing-document baseline require explicit authorization. They were not edited here.
- `playwright.task0005.config.ts` exists there and matches the current file.
- Protected `web/src/components/checkout/quote-review.tsx` and `web/src/styles.css` exist there but differ from the working baseline used by local visual proof. Do not silently absorb those unrelated hunks or claim this run proves the deployment-base candidate.
- Several editable governing documents/harness files are already untracked relative to root HEAD; their baseline must be resolved separately from this task's small edits. The receipt is not a complete transitive candidate-dependency audit.

Proposed next step: select an explicitly approved baseline (potentially `5b25cd06`), authorize only named prerequisites plus this task's exact changes, construct one candidate in an isolated checkout, and rerun required checks there before spec68/quality69 review that same commit. No candidate construction was attempted. If baseline prerequisite inclusion cannot be approved within this boundary, keep this handoff blocked rather than importing the dirty workspace.

The minimum directly identified executable/test prerequisites on `5b25cd06` are exactly `tests/evidence/task0005-readiness.ts`, `tests/evidence/task0005-readiness.test.ts`, `tests/evidence/task0005-allowance-baseline.ts`, and `tests/evidence/task0005-allowance-baseline.test.ts` (all demo-relative). Canonical `REQUIREMENTS.md` and the approved plan/critic are separately named authority-document additions, not runtime dependencies. Protected quote-review/styles are **not required by this email-only implementation as new dependencies**: preserving their deployment-baseline versions is a valid candidate-construction option, subject to rerunning visual/regression checks on that actual candidate. Reproducing this working-tree visual result byte-for-byte would instead require explicit approval of their pre-existing differences; no such approval is inferred or recommended as a blanket import.

Seven task-edited derived documents are absent from `5b25cd06`: `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, `PLAN.md`, `design-system/pages/slice-001-go-paypal-wallet.md`, `slices/SLICE-001.md`, and `tracking/todos.md`. Including them on that base requires explicit approval of their captured pre-existing document bodies plus the dated task notes; the task-only note hunks cannot create absent documents. The remaining14 edited existing files have paths on that base, but preimage compatibility and hunk application still need isolated verification. Request named authority for these documents, the four test prerequisites and canonical approved requirement/plan records separately from task hunks; do not stage unrelated backend/payment/style work.

AC1–4 have local implementation/check evidence above; AC5 documentation and preservation are verified locally, but candidate attribution and independent same-commit reviews remain pending. Hosted persistent proof, manual inbox, live allowance comparison, actual contained-failure evidence, EVID-0006 completion, TASK-0005 acceptance and payment/full-slice gates are not closed. Temporary expiry remains unresolved/deferred, not fixed. The executor/executing-plans/TDD methods kept the change scoped; the debugging method identified the local socket restriction without changing application behavior.

## Coordinator candidate verification — 2026-09-19

User separately approved the local candidate commit with named prerequisite tests and approved documents; no push or deployment. Isolated checkout: `/private/tmp/task0005-email-candidate.vuXnuf`, base `5b25cd06ede25522183a963e18ecefede35edf42`. Task patch applied without unrelated runtime edits. The persistent hosted harness includes its existing readiness and allowance baseline wiring alongside the four approved helper files. Seven absent derived documents and canonical requirements/approved plan records were included explicitly. Backend, payment/quote components, styles, configuration and historical artifacts remain deployment-base versions.

Fresh checks on this isolated candidate: full Vitest **449 passed, 8 database-gated skipped**; typecheck and lint exit0; local Playwright **12 passed, 2 temporary cases deferred**, 15.0s. Browser setup built server/web successfully. Hosted discovery lists exactly one persistent-only TC-0014 test; it was not executed. Tests used a clean environment, fake provider values, local Chrome and fixture interception; no `.env.local`, real OTP, provider or database operation. Installed dependencies are an ignored local symlink, not committed. Earlier441-test results above describe the dirty working-source mirror, not this deployment-base candidate. Independent same-commit reviews remain pending.
