# Dynamic index routing in Agent Studio

Local demo of an application choosing an approved Algolia index set before a direct Agent Studio completion request.

## User contract

- Routing is controlled by the application and a server-side allowlist.
- Users can inspect the selected route and index set before the request runs.
- The demo never treats a browser-provided index name as trusted.
- With one available index, it demonstrates request construction only; it does not claim to demonstrate dynamic selection.
- Results are illustrative and are not production performance claims.

## Local use

1. From the parent `Algolia Projects` folder, copy the shared `.env.example` to `.env`.
2. Fill in the application ID, product index, Agent Studio key, management/indexing keys, and Agent Studio provider/model. Do not fill in generated index names, allowlists, or agent IDs.
3. Run `npm run provision`. It verifies the product index, creates and seeds the support index, and creates or updates the direct Agent Studio agent. Generated IDs and index names are written back to the shared `.env` and to the ignored `provisioned.env` file.
4. The script writes `ALGOLIA_SUPPORT_INDEX`, `ALGOLIA_INDEX_ALLOWLIST`, and `DYNAMIC_ROUTING_AGENT_STUDIO_AGENT_ID` into the shared `.env`, preserving the credentials you supplied. Set `PUBLISH_AGENTS=true` or pass `--publish` when the draft is ready to publish.
5. Start the Next.js app with `npm run dev`, then open `http://localhost:3000`. For a production-style local check, run `npm run build && npm start`.
6. Choose a trusted context, enter a question, and inspect the route, approved indices, response, and timings.

`ALGOLIA_INDEX_ALLOWLIST` is generated and ordered: it contains the product index you supplied first, followed by the support index created by the script. The script overwrites any manually supplied allowlist so an unrelated index cannot enter the demo route map.

`npm run provision -- --dry-run` checks the local values and prints the planned writes without contacting Algolia. `--skip-index` leaves the support index alone; `--skip-agent` leaves the Agent Studio agent alone. The provisioning script uses the direct Agent Studio API and Algolia Search indexing endpoints; it does not use DocSearch.

To update the linked Vercel project after provisioning, export a Vercel access token in the shell and add `--sync-vercel`: `VERCEL_TOKEN=... npm run provision -- --publish --sync-vercel`. This updates production, preview, and development with only runtime values; management and indexing keys are never uploaded. A new deployment is required for Vercel environment changes to take effect.

## Implementation details

- Transport: native Node `fetch`; no Algolia client SDK is used.
- Provider API: Agent Studio REST API v1, `POST /agent-studio/1/agents/{AGENT_ID}/completions`.
- Request compatibility: `stream=false&compatibilityMode=ai-sdk-5`; the server sends `messages` and the server-selected `indices` array.
- Authentication: the application ID and Search API key remain server-side. The browser receives readiness booleans, route labels, and approved index names only.
- Search-tool metadata is shown when it is returned by the provider; an absent field is reported as “Not returned by provider.”

The app uses the Next.js App Router and server-side Route Handlers, so it can run locally or on Vercel. Add the same server-only environment variables to the Vercel project; do not expose them as `NEXT_PUBLIC_*` values.

The agent configuration uses Agent Studio’s native `algolia_search_index` tool with `mode: "dynamic"` and `allowUnlistedIndices: true`. See Algolia’s [Agent Studio API](https://www.algolia.com/doc/rest-api/agent-studio) and [Agent Studio tools guide](https://www.algolia.com/doc/guides/algolia-ai/agent-studio/how-to/tools/overview).

## Checks

Run `npm test` for the route-map, allowlist, request-shape, and response-normalization tests. Run `git diff --check` to check whitespace. A live completion additionally requires a published Agent Studio agent, the configured Search API key, and approved test indices. `npm run provision` verifies and creates the demo resources when the supplied keys have the documented ACLs; local tests do not make provider calls.

See [SPEC.md](SPEC.md) for the implementation contract.
