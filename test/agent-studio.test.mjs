import test from "node:test";
import assert from "node:assert/strict";
import { completionUrl, createCompletionPayload, extractCompletionText, extractSearchToolMetadata } from "../src/agent-studio.mjs";

test("documents the Agent Studio REST v1 completion URL", () => {
  assert.equal(
    completionUrl({ applicationId: "app", agentId: "agent" }),
    "https://app.algolia.net/agent-studio/1/agents/agent/completions?stream=false&compatibilityMode=ai-sdk-5",
  );
});

test("puts server-selected indices in the direct completion payload", () => {
  const payload = createCompletionPayload("Find a rain jacket", ["catalog_test"]);
  assert.deepEqual(payload.indices, ["catalog_test"]);
  assert.equal(payload.messages[0].role, "user");
  assert.equal(payload.messages[0].parts[0].text, "Find a rain jacket");
});

test("extracts text and search-tool metadata without requiring one response shape", () => {
  const payload = {
    parts: [{ type: "text", text: "A grounded answer." }],
    metadata: { searchTool: { indices: ["catalog_test"], hits: 3 } },
  };
  assert.equal(extractCompletionText(payload), "A grounded answer.");
  assert.deepEqual(extractSearchToolMetadata(payload), { indices: ["catalog_test"], hits: 3 });
});
