import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../public/markdown.js";

test("renders common Agent Studio response markdown", () => {
  const html = renderMarkdown("## Rain gear\n\n- **Waterproof shell**\n- `Packable` layer\n\n[View product](https://example.com/product)");

  assert.match(html, /<h2>Rain gear<\/h2>/);
  assert.match(html, /<strong>Waterproof shell<\/strong>/);
  assert.match(html, /<code>Packable<\/code>/);
  assert.match(html, /<a href="https:\/\/example\.com\/product"/);
});

test("escapes raw HTML instead of injecting it into the response", () => {
  const html = renderMarkdown("<script>alert('xss')</script>");

  assert.match(html, /&lt;script&gt;alert\(&#39;xss&#39;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
