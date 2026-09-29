# TASK-0009 focused accessibility follow-up — quality review

- Lane: `quality`; mode: `scoped`; independent reviewer `/root/task0009_local_quality`, role19 of approved cap19.
- Verdict: **approved for the exact local test/evidence increment**, with zero Critical, Important or Minor findings. This is not full AC4 or TASK-0009 acceptance.
- Authority: `accessibility-cap19-authorization.md`, `user:TASK-0009:2026-09-27:accessibility-cap19-approved`.
- Base commit: `5239e79f4d1b4aa557566ac9699ac34bf07d3359`; candidate commit: **none**. Review binds to local hashes, not a clean application commit or final same-candidate-commit approval.

## Frozen candidate and evidence

Independently recomputed and matched:

| File | SHA-256 |
| --- | --- |
| `tests/e2e/hosted-slice.spec.ts` | `6cfef6747b87e63b54e0f1dd24fe466ceebfddfe5e7542376a3d8f989bcc75d3` |
| `web/src/styles.css` — unchanged | `501164fd4d387e6cdaaa5d30efc07c9d44895ce61e0d83e3d93583b2037ac0b5` |
| `tracking/tasks/TASK-0009/accessibility-followup-execution.md` | `ce5e840299cc4fb29c602f6862ffc46f3fdf231ba1156a0a2a5dd06e297be73f` |

Prior browser candidate: `9cf5f41ce3ed3aa82d662279cfd7f349f92b3c6a5048782eb65d01cc44e8739b`, previously reviewed by this lane. Read the new authorization, execution and specification reports; inspected the changed contrast/polling code against retained prior source and the four selectors' current CSS/component usage. Production CSS hash is unchanged, preserving the two accepted corrections and unrelated prior CSS.

Reviewed executor's two matrix passes in9.6s,16 combinations,36 rendered-proof occurrences and typecheck/lint/diff-check receipts. Coordinator independently reports the same exact matrix passing twice at project level in9.9s with current generated receipts. These runtime observations are supplied evidence, not reruns by this reviewer.

## Quality assessment

- Rendered contrast method: original foreground and each nonempty text node's document-coordinate rectangles are collected before screenshot styling. The PNG is captured at CSS scale and decoded in memory; image width, rectangle bounds and nonzero samples are checked. The WCAG luminance calculation scans every covered rectangle pixel and retains the minimum contrast, avoiding selection of a favorable adjacent pixel. For these current opaque RGB text styles and static geometry, this is defensible evidence for the remaining four selectors.
- Screenshot styling hides glyph fill without changing `color`, layout or background paint. It also suppresses text shadow; current inspected CSS has no text-shadow or text-fill declaration, so this does not remove an existing text effect from the present candidate. Backgrounds, inset decoration and pseudo-element geometry remain available to the measurement. This is not a general certification method for future opacity, filter, text-fill, overlay, animation or unsupported color changes.
- Assertion coverage: the fallback allowlist is limited to `.account-context`, `.section-copy`, `#workspace-heading` and `.selected`. An unresolved selector outside that list, absent measured runs, invalid geometry/foreground or insufficient contrast remains in the failing unresolved list. Every measured run must pass; the previous conservative bounds and decorative distinction remain. The actual serious/critical axe gate is unchanged. Replacing blanket incomplete rejection therefore requires additional evidence rather than simply suppressing axe unknowns.
- Observable fallback: the one-second polling deadline requires matching reduced-transparency media, at least one surface and every glass/reading surface to have no blur and an opaque computed RGB background. Missing or permanently transparent surfaces fail. Existing post-wait reduced-motion and fallback assertions remain. This corrects synchronization without relaxing the required visual state.
- Isolation and side effects: local synthetic interception and fixed-loopback configuration remain unchanged. PNG decoding uses an in-memory data URL and unattached canvas, not external traffic or a new service. Pixel screenshots are not written as user artifacts; the existing explicit synthetic screenshot remains separate. Generated diagnostic JSON carries selected measurements rather than session or request payloads. No production or provider behavior changed.

## Findings and disposition

New actionable quality findings: none. Prior contrast unknowns are resolved only for the reported static four-state, two-theme, two-viewport fixture matrix; the timing-sensitive fallback check now has a bounded observable-state wait. This review makes no universal paint-engine, WCAG or future-style guarantee.

Independent reviewer actions were read-only source/hash inspection and writing this report only. No runtime rerun, browser session, provider/network request, OTP, database operation, production edit or commit occurred. No further review escalation is required for this bounded increment; stop further role dispatch at cap19.

Local matrix green does not close full AC4/TC-0011, TASK-0009/TC-0012, EVID-0005 or SLICE-001. Complete keyboard/screen-reader and exception/loading/failure-state coverage, provider hydration, hosted identity/payment/delayed-webhook evidence, final same-candidate-commit reviews and user acceptance remain separate. EVID-0006 stays partial; Resend failure remains skipped, not run and not passed. No commit, push or deployment is authorized.
