import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const INDEX_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function loadDotEnv(filePath = resolve(process.cwd(), ".env")) {
  if (!existsSync(filePath)) return;

  const contents = readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  }
}

export function parseIndexAllowlist(value = "") {
  const indices = [...new Set(value.split(",").map((index) => index.trim()).filter(Boolean))];
  const invalid = indices.filter((index) => !INDEX_NAME_PATTERN.test(index));
  if (invalid.length > 0) {
    throw new Error(`Invalid Algolia index name(s) in ALGOLIA_INDEX_ALLOWLIST: ${invalid.join(", ")}`);
  }
  return indices;
}

export function loadConfig({ env = process.env, dotenvPath } = {}) {
  if (dotenvPath !== null) loadDotEnv(dotenvPath);

  const applicationId = (env.ALGOLIA_APPLICATION_ID || "").trim();
  const apiKey = (env.ALGOLIA_AGENT_STUDIO_API_KEY || "").trim();
  const agentId = (env.AGENT_STUDIO_AGENT_ID || "").trim();
  const approvedIndices = parseIndexAllowlist(env.ALGOLIA_INDEX_ALLOWLIST || "");
  const port = Number.parseInt(env.PORT || "3000", 10);

  return {
    applicationId,
    apiKey,
    agentId,
    approvedIndices,
    port: Number.isInteger(port) && port > 0 ? port : 3000,
    provider: {
      apiVersion: "1",
      client: "native fetch (no SDK)",
      compatibilityMode: "ai-sdk-5",
    },
  };
}

export function publicConfig(config) {
  return {
    approvedIndices: config.approvedIndices,
    provider: config.provider,
    readiness: {
      applicationId: Boolean(config.applicationId),
      apiKey: Boolean(config.apiKey),
      agentId: Boolean(config.agentId),
      indices: config.approvedIndices.length > 0,
    },
  };
}

export function assertCompletionConfig(config) {
  const missing = [];
  if (!config.applicationId) missing.push("ALGOLIA_APPLICATION_ID");
  if (!config.apiKey) missing.push("ALGOLIA_AGENT_STUDIO_API_KEY");
  if (!config.agentId) missing.push("AGENT_STUDIO_AGENT_ID");
  if (config.approvedIndices.length === 0) missing.push("ALGOLIA_INDEX_ALLOWLIST");
  if (missing.length > 0) {
    const error = new Error(`Missing required configuration: ${missing.join(", ")}`);
    error.statusCode = 503;
    throw error;
  }
}
