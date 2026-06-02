# Knowledge Sources

Single source of truth for external reference locations. Instruction files point here instead of hard-coding paths, so a path change only happens in one place.

## Payment Integration Wiki
- Path: `/Users/tengtao/Development/wiki-v2` (machine-specific; override with the `WIKI_V2_PATH` environment variable if your checkout differs).
- This is the only place the absolute path is recorded. If the wiki moves, update it here only.
- Before using the wiki, read and follow its local `AGENTS.md`.
- Use the wiki during discovery, planning, and payment-flow changes for PayPal and Stripe details.
- Prefer wiki concepts and analyses over raw scraped files. Treat wiki content as reference, not as code to copy blindly. For high-stakes or likely-changed PSP behavior, verify against official PSP docs.
- Extract conclusions into a demo's `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, or a `learnings/` entry. Do not paste large wiki sections into any `AGENTS.md`.
