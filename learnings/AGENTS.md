# Learning Pool Rules

## Purpose
This directory stores reusable lessons learned from payment demo development. Raw notes belong in each demo's `tracking/learnings.md`. Only reusable, reviewed lessons belong here.

## Search Rules
- Before solving a difficult payment, PSP, architecture, mobile, or demo-ops problem, search `learnings/INDEX.md`.
- Then search this directory with relevant keywords.
- Follow `[[source]]` links when the origin matters.

## Add Rules
- Add a learning only when it is reusable across demos or important for future maintenance.
- Include source links using `[[...]]`.
- Prefer one focused lesson per file.
- Do not add secrets, merchant credentials, private customer data, or unsupported PSP claims.

## Category Rules
- Use the existing categories when they fit: `payment`, `frontend`, `backend`, `mobile`, and `demo-ops`.
- If a reusable learning does not fit any existing category, create a clear new category folder.
- Update `INDEX.md` whenever a new category is created.
- Avoid a permanent `misc` category. If the lesson is too unclear to categorize, keep it in the source demo's `tracking/learnings.md` until it becomes clearer.
- Update `scripts/check-agent-system.sh` only when a new category becomes a required baseline category for this repo.

## Update Rules
- Update an existing learning when new information refines the same lesson.
- Keep source links current.
- If the old lesson is no longer correct, mark it as superseded instead of silently deleting it.

## Delete Rules
- Do not delete learning entries casually.
- Prefer marking entries as `Deprecated` or `Superseded`.
- Delete only duplicate, empty, or clearly incorrect entries after preserving useful source links.

## Index Rules
- Every learning entry must be listed in `INDEX.md`.
- Use concise summaries and clear categories.
