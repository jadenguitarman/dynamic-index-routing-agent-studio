# Dynamic index routing in Agent Studio

Local demo of an application choosing an approved Algolia index set before a direct Agent Studio completion request.

## User contract

- Routing is controlled by the application and a server-side allowlist.
- Users can inspect the selected route and index set before the request runs.
- The demo never treats a browser-provided index name as trusted.
- With one available index, it demonstrates request construction only; it does not claim to demonstrate dynamic selection.
- Results are illustrative and are not production performance claims.

## Local use

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install the project dependencies.
3. Start the local app with `npm run dev`.
4. Choose a trusted context, enter a product question, and inspect the route, approved indices, response, and timings.

`ALGOLIA_INDEX_ALLOWLIST` is ordered: the first approved index backs the Product catalog route, and the second backs the Support knowledge route. Use dedicated test indices or partitions for this demo. If only one index is configured, the app intentionally exposes one route and labels the result as request-construction evidence rather than dynamic-routing evidence.

## Implementation details

- Transport: native Node `fetch`; no Algolia client SDK is used.
- Provider API: Agent Studio REST API v1, `POST /agent-studio/1/agents/{AGENT_ID}/completions`.
- Request compatibility: `stream=false&compatibilityMode=ai-sdk-5`; the server sends `messages` and the server-selected `indices` array.
- Authentication: the application ID and Search API key remain server-side. The browser receives readiness booleans, route labels, and approved index names only.
- Search-tool metadata is shown when it is returned by the provider; an absent field is reported as “Not returned by provider.”

The request shape and dynamic-index behavior were checked against Algolia’s current [Agent Studio migration guidance](https://docsearch.algolia.com/docs/agent-studio/migrate-to-agent-studio/) and [dynamic indices documentation](https://docsearch.algolia.com/docs/agent-studio/dynamic-indices/) on 2026-09-22.

## Checks

Run `npm test` for the route-map, allowlist, request-shape, and response-normalization tests. Run `git diff --check` to check whitespace. A live completion additionally requires a published Agent Studio agent, the configured Search API key, and approved test indices; those provider-side conditions are not verified by local tests.

See [SPEC.md](SPEC.md) for the implementation contract.
