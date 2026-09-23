# Specification

## Contract

Honor the user contract in `README.md`: application-owned allowlisted routing, visible decisions, no trusted browser index names, and no production-performance claims.

## Scope

Build a small local app that accepts trusted context and a user question, maps the context to an approved route, and sends a direct Agent Studio completion request.

## Required behavior

- Keep the route map and index allowlist on the server.
- Show the selected route and approved index set before completion.
- Reject unknown routes and indices.
- Record route time, completion time, selected indices, and available search-tool metadata.
- Use dedicated test indices or partitions when demonstrating dynamic selection.

## Implemented transport

- The local server uses the Agent Studio REST API v1 completion endpoint: `POST /agent-studio/1/agents/{AGENT_ID}/completions`.
- It uses native Node `fetch` rather than a client SDK.
- Requests use `stream=false&compatibilityMode=ai-sdk-5` and send `messages` plus the route-selected `indices` array.
- The server route map has two fixed contexts: `catalog` selects the first configured allowlisted index and `support` selects the second. A route is not exposed unless its index exists in the allowlist.
- The browser may submit a route ID and question, but it cannot submit an index list. The server resolves the route again and rejects a request that attempts to provide `indices`.
- Provider search-tool metadata is preserved only when the completion response returns a supported metadata field; missing metadata remains explicitly absent.

The provisioning script configures Agent Studio’s native `algolia_search_index` tool with `mode: "dynamic"` and `allowUnlistedIndices: true`. The implementation is based on Algolia’s [Agent Studio API](https://www.algolia.com/doc/rest-api/agent-studio) and [tools guide](https://www.algolia.com/doc/guides/algolia-ai/agent-studio/how-to/tools/overview).

## Provisioning

`npm run provision` verifies the supplied product index, creates and seeds a small support index, and creates or updates the demo agent through the direct Agent Studio API. `ALGOLIA_INDEXING_API_KEY` is used only for index writes; `ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY` is used only for agent create/update/publish; `ALGOLIA_AGENT_STUDIO_API_KEY` remains the runtime completion key. The script never needs an Admin API key. `--dry-run`, `--skip-index`, `--skip-agent`, and `--publish` control the operation without changing the application contract.

## Non-goals

No arbitrary index selection, authentication replacement, production dashboard, or claim that one index demonstrates dynamic routing.

## Acceptance

The demo makes the pre-request routing decision visible, blocks an unallowlisted target, and preserves secrets outside the browser and repository.

Local acceptance checks are `npm test`, `npm run build`, `node --check public/app.js`, and `git diff --check`. The browser is served by Next.js, and provider calls run in Node.js Route Handlers compatible with Vercel. A real provider completion remains unverified until a user supplies a published agent, a Search API key, and dedicated test indices in `.env`.
