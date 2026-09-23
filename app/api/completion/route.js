import { performance } from "node:perf_hooks";
import { assertCompletionConfig, loadConfig } from "../../../src/config.mjs";
import { requestCompletion } from "../../../src/agent-studio.mjs";
import { assertApprovedIndices, resolveRoute } from "../../../src/routing.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  return Response.json({ error: error.message || "Unexpected server error.", ...(error.providerStatus ? { providerStatus: error.providerStatus } : {}) }, { status });
}

function validateQuestion(question) {
  if (typeof question !== "string" || question.trim().length < 1) throw Object.assign(new Error("Enter a question before running the completion."), { statusCode: 400 });
  if (question.length > 4_000) throw Object.assign(new Error("Question must be 4,000 characters or fewer."), { statusCode: 400 });
  return question.trim();
}

export async function POST(request) {
  const startedAt = performance.now();
  try {
    const body = await request.json();
    if (Object.prototype.hasOwnProperty.call(body, "indices")) throw Object.assign(new Error("Indices are selected by the server and must not be provided by the browser."), { statusCode: 400 });
    const config = loadConfig();
    const question = validateQuestion(body.question);
    const route = resolveRoute(body.route, config.approvedIndices);
    assertApprovedIndices(route.indices, config.approvedIndices);
    const routeMs = Math.round(performance.now() - startedAt);
    assertCompletionConfig(config);
    const completionStartedAt = performance.now();
    const completion = await requestCompletion({ config, question, indices: route.indices });
    return Response.json({ route, timings: { routeMs, completionMs: Math.round(performance.now() - completionStartedAt), totalMs: Math.round(performance.now() - startedAt) }, selectedIndices: route.indices, searchToolMetadata: completion.searchToolMetadata, answer: completion.text || "Agent Studio returned no text in the response payload.", provider: config.provider });
  } catch (error) {
    return errorResponse(error);
  }
}
