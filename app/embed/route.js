import { readFileSync } from "node:fs";
import { join } from "node:path";
import { corsHeaders } from "../../src/cors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function demoContainer() {
  const source = readFileSync(join(process.cwd(), "public", "index.html"), "utf8");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
  const container = body.match(/<main\b[^>]*class=["'][^"']*\bshell\b[^"']*["'][\s\S]*?<\/main>/i)?.[0];
  if (!container) throw new Error("The demo shell container could not be found.");
  return container;
}

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function GET(request) {
  try {
    const headers = corsHeaders(request);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    return new Response(demoContainer(), { headers });
  } catch (error) {
    const headers = corsHeaders(request);
    headers.set("Content-Type", "text/plain; charset=utf-8");
    return new Response(error.message || "Could not load the demo embed.", { status: 500, headers });
  }
}
