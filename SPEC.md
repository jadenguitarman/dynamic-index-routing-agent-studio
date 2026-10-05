# Specification

## Contract

Honor the user contract in `README.md`: application-owned allowlisted routing, visible decisions, no trusted browser index names, and no production-performance claims.

## Scope

Build a small local app that accepts trusted context and a user question, maps the context to an approved route and scope-specific Agent Studio agent, and sends a direct completion request.

## Required behavior

- Keep the route map and index allowlist on the server.
- Show the simulated application context, selected route, and configured index scope before completion.
- Reject unknown routes and indices.
- Record route time, completion time, selected scope, actual executed search indices, and available search-tool metadata.
- Use dedicated test indices or partitions when demonstrating dynamic selection.

## Implemented transport

- The local server uses the Agent Studio REST API v1 completion endpoint: `POST /agent-studio/1/agents/{AGENT_ID}/completions`.
- It uses native Node `fetch` rather than a client SDK.
- Requests use `stream=false&compatibilityMode=ai-sdk-5` and send `messages` to the Agent Studio agent selected by the server.
- The server route map has two fixed contexts: `catalog` selects a published agent configured with the first allowlisted index and `support` selects a published agent configured with the second. A route is not exposed unless its index exists in the allowlist.
- The browser may submit a route ID and question, but it cannot submit an index list or agent ID. The server resolves both again and rejects a request that attempts to provide `indices`.
- Provider search-tool metadata is preserved only when the completion response returns a supported metadata field; missing metadata remains explicitly absent.

The provisioning script creates two direct Agent Studio agents, each with one statically configured `algolia_search_index` tool. The application selects the agent from trusted context; the server-side allowlist and agent map remain the application security boundary. The implementation is based on Algolia’s [Agent Studio API](https://www.algolia.com/doc/rest-api/agent-studio) and [tools guide](https://www.algolia.com/doc/guides/algolia-ai/agent-studio/how-to/tools/overview).

## Provisioning

`npm run provision` verifies the supplied product index, creates and seeds a small support index, and creates or updates the demo agent through the direct Agent Studio API. `ALGOLIA_INDEXING_API_KEY` is used only for index writes; `ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY` is used only for agent create/update/publish; `ALGOLIA_AGENT_STUDIO_API_KEY` remains the runtime completion key. The script never needs an Admin API key. `--dry-run`, `--skip-index`, `--skip-agent`, and `--publish` control the operation without changing the application contract.

## Non-goals

No arbitrary index selection, authentication replacement, production dashboard, or claim that one index demonstrates dynamic routing.

## Acceptance

The demo makes the pre-request routing decision visible, blocks an unallowlisted target, and preserves secrets outside the browser and repository.

Local acceptance checks are `npm test`, `npm run build`, `node --check public/app.js`, and `git diff --check`. The browser is served by Next.js, and provider calls run in Node.js Route Handlers compatible with Vercel. A real provider completion remains unverified until a user supplies a published agent, a Search API key, and dedicated test indices in `.env`.
