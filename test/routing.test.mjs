import test from "node:test";
import assert from "node:assert/strict";
import { parseIndexAllowlist } from "../src/config.mjs";
import { assertApprovedIndices, buildRouteMap, resolveRoute } from "../src/routing.mjs";

test("parses and deduplicates the server-side index allowlist", () => {
  assert.deepEqual(parseIndexAllowlist(" catalog_test, support_test, catalog_test "), ["catalog_test", "support_test"]);
});

test("rejects invalid configured index names", () => {
  assert.throws(() => parseIndexAllowlist("catalog test"), /Invalid Algolia index name/);
});

test("builds only routes backed by approved indices", () => {
  assert.deepEqual(buildRouteMap(["catalog_test"]), [
    {
      id: "catalog",
      label: "Product catalog",
      description: "A product-oriented test index or partition for discovery questions.",
      context: "catalog",
      indices: ["catalog_test"],
    },
  ]);
  assert.deepEqual(buildRouteMap(["catalog_test", "support_test"]).map((route) => route.id), ["catalog", "support"]);
});

test("rejects unknown routes and unallowlisted indices", () => {
  assert.throws(() => resolveRoute("unknown", ["catalog_test"]), /Unknown route/);
  assert.throws(() => assertApprovedIndices(["not_approved"], ["catalog_test"]), /Unallowlisted index/);
});
