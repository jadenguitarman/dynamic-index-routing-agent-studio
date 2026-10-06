import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.mjs";

test("derives the generated allowlist when deployment variables are present without the combined value", () => {
  const config = loadConfig({
    dotenvPath: null,
    env: {
      ALGOLIA_APPLICATION_ID: "app",
      ALGOLIA_AGENT_STUDIO_API_KEY: "runtime-key",
      DYNAMIC_ROUTING_AGENT_ID: "agent",
      ALGOLIA_PRODUCT_INDEX: "catalog_test",
      ALGOLIA_SUPPORT_INDEX: "support_test",
    },
  });

  assert.deepEqual(config.approvedIndices, ["catalog_test", "support_test"]);
});
