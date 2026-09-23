# Dynamic index routing in Agent Studio

Technical demo for showing how an application selects an approved Algolia index set before sending a direct Agent Studio completion request.

## Planned demo

- Server-side route map based on trusted request context.
- Approved route names mapped to approved index targets.
- Direct Agent Studio completion request using the exact API/client version documented by the demo.
- Visible rejection of routes or indices outside the allowlist.
- Timing for route selection, completion, and search-tool calls where available.

If the test environment has only one index, the demo will show route selection and request construction but will not claim to demonstrate dynamic index selection.
