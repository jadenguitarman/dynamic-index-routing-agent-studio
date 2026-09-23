# AGENTS.md

Read `README.md` first. It is the user contract. Read `SPEC.md` before changing behavior.

## Behavior

- Keep the demo focused on direct Agent Studio usage. Do not add DocSearch.
- Keep route and index selection server-side and allowlisted.
- Verify the exact Agent Studio API/client version before documenting request fields.
- Never commit secrets or require an Admin API key for the demo.
- Label test fixtures and measurements honestly; do not turn controlled results into production claims.
- Make the smallest change that satisfies the request and update `SPEC.md` when behavior changes.

Before handing off work, run the documented checks, confirm `.env` is ignored, and explain any unverified provider behavior.
