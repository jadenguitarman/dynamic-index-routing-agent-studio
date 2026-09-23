# Dynamic index routing in Agent Studio

Local demo of an application choosing an approved Algolia index set before a direct Agent Studio completion request.

## User contract

- Routing is controlled by the application and a server-side allowlist.
- Users can inspect the selected route and index set before the request runs.
- The demo never treats a browser-provided index name as trusted.
- With one available index, it demonstrates request construction only; it does not claim to demonstrate dynamic selection.
- Results are illustrative and are not production performance claims.

## Planned local use

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install the project dependencies.
3. Start the local app with `npm run dev`.
4. Choose a trusted context, enter a product question, and inspect the route, approved indices, response, and timings.

The exact API/client version used by the demo must be documented in the implementation before the request shape is treated as stable.

See [SPEC.md](SPEC.md) for the implementation contract.
