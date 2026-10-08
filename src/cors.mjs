const DEFAULT_EMBED_ORIGINS = [
  "https://authorscollective.org",
  "https://www.authorscollective.org",
  "https://algolia.com",
  "https://www.algolia.com",
  "https://blog.algolia.com",
];

export function allowedEmbedOrigins() {
  const configured = (process.env.DYNAMIC_ROUTING_EMBED_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_EMBED_ORIGINS, ...configured]);
}

export function corsHeaders(request) {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin && allowedEmbedOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  }
  return headers;
}

export function jsonWithCors(request, payload, init = {}) {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return Response.json(payload, { ...init, headers });
}

export function optionsWithCors(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
