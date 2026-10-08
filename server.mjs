import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { assertCompletionConfig, loadConfig, publicConfig } from "./src/config.mjs";
import { requestCompletion } from "./src/agent-studio.mjs";
import { assertApprovedIndices, buildRouteMap, resolveRoute } from "./src/routing.mjs";
import { nodeCorsHeaders } from "./src/cors.mjs";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PUBLIC_ROOT = join(ROOT, "public");
const config = loadConfig();

function sendJson(response, statusCode, body, request) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...nodeCorsHeaders(request?.headers?.origin),
  });
  response.end(JSON.stringify(body));
}

function sendError(response, error, request) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  sendJson(response, statusCode, {
    error: error.message || "Unexpected server error.",
    ...(error.providerStatus ? { providerStatus: error.providerStatus } : {}),
  }, request);
}

function readJson(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
    });
    request.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function validateQuestion(question) {
  if (typeof question !== "string" || question.trim().length < 1) {
    throw Object.assign(new Error("Enter a question before running the completion."), { statusCode: 400 });
  }
  if (question.length > 4_000) {
    throw Object.assign(new Error("Question must be 4,000 characters or fewer."), { statusCode: 400 });
  }
  return question.trim();
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS" && ["/api/routes", "/api/completion", "/embed"].includes(url.pathname)) {
    response.writeHead(204, {
      ...nodeCorsHeaders(request.headers.origin),
    });
    response.end();
    return true;
  }

  if (request.method === "GET" && url.pathname === "/embed") {
    const source = readFileSync(join(PUBLIC_ROOT, "index.html"), "utf8");
    const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
    const container = body.match(/<main\b[^>]*class=["'][^"']*\bshell\b[^"']*["'][\s\S]*?<\/main>/i)?.[0];
    if (!container) {
      sendError(response, new Error("The demo shell container could not be found."), request);
      return true;
    }
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      ...nodeCorsHeaders(request.headers.origin),
    });
    response.end(container);
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/routes") {
    sendJson(response, 200, {
      ...publicConfig(config),
      routes: buildRouteMap(config.approvedIndices),
    }, request);
    return true;
  }

  if (request.method !== "POST" || url.pathname !== "/api/completion") return false;

  const startedAt = performance.now();
  try {
    const body = await readJson(request);
    if (Object.prototype.hasOwnProperty.call(body, "indices")) {
      throw Object.assign(new Error("Indices are selected by the server and must not be provided by the browser."), { statusCode: 400 });
    }

    const question = validateQuestion(body.question);
    // Keep the agent fixed while changing only the approved request scope.
    // The browser never gets to choose the underlying index directly.
    const route = resolveRoute(body.route, config.approvedIndices);
    assertApprovedIndices(route.indices, config.approvedIndices);
    if (!config.agentId) throw Object.assign(new Error("No dynamic Agent Studio agent is configured."), { statusCode: 503 });
    const routeMs = Math.round(performance.now() - startedAt);

    assertCompletionConfig(config);
    const completionStartedAt = performance.now();
    const completion = await requestCompletion({ config: { ...config, agentId: config.agentId }, question, indices: route.indices });
    const completionMs = Math.round(performance.now() - completionStartedAt);

    sendJson(response, 200, {
      route,
      timings: { routeMs, completionMs, totalMs: Math.round(performance.now() - startedAt) },
      selectedIndices: route.indices,
      request: { algolia: { indices: route.indices } },
      executedSearchIndices: completion.executedSearchIndices,
      searchToolMetadata: completion.searchToolMetadata,
      answer: completion.text || "Agent Studio returned no text in the response payload.",
      provider: config.provider,
    }, request);
  } catch (error) {
    sendError(response, error, request);
  }
  return true;
}

function contentType(filePath) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  }[extname(filePath)] || "application/octet-stream";
}

function serveStatic(request, response, url) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." }, request);
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(PUBLIC_ROOT, requestedPath));
  if (!filePath.startsWith(`${PUBLIC_ROOT}/`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(response, 404, { error: "Not found." }, request);
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Cache-Control": "no-store",
    ...(["/app.js", "/markdown.js"].includes(url.pathname) ? { "Access-Control-Allow-Origin": "*" } : {}),
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  try {
    if (await handleApi(request, response, url)) return;
    serveStatic(request, response, url);
  } catch (error) {
    sendError(response, error, request);
  }
});

server.listen(config.port, () => {
  console.log(`Dynamic index routing demo listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
