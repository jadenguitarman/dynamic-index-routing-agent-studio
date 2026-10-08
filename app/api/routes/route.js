import { buildRouteMap } from "../../../src/routing.mjs";
import { loadConfig, publicConfig } from "../../../src/config.mjs";
import { jsonWithCors, optionsWithCors } from "../../../src/cors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(request) {
  return optionsWithCors(request);
}

export async function GET(request) {
  try {
    const config = loadConfig();
    return jsonWithCors(request, { ...publicConfig(config), routes: buildRouteMap(config.approvedIndices) });
  } catch (error) {
    return jsonWithCors(request, { error: error.message || "Could not load routing configuration." }, { status: 500 });
  }
}
