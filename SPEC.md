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

## Non-goals

No arbitrary index selection, authentication replacement, production dashboard, or claim that one index demonstrates dynamic routing.

## Acceptance

The demo makes the pre-request routing decision visible, blocks an unallowlisted target, and preserves secrets outside the browser and repository.
