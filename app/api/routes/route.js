import { buildRouteMap } from "../../../src/routing.mjs";
import { loadConfig, publicConfig } from "../../../src/config.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = loadConfig();
    return Response.json({ ...publicConfig(config), routes: buildRouteMap(config.approvedIndices) });
  } catch (error) {
    return Response.json({ error: error.message || "Could not load routing configuration." }, { status: 500 });
  }
}
