import { randomUUID } from "node:crypto";

export function completionUrl(config) {
  const applicationId = encodeURIComponent(config.applicationId);
  const agentId = encodeURIComponent(config.agentId);
  return `https://${applicationId}.algolia.net/agent-studio/1/agents/${agentId}/completions?stream=false&compatibilityMode=ai-sdk-5`;
}

export function createCompletionPayload(question, indices) {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new Error("Agent Studio completion requests need at least one selected index.");
  }

  return {
    id: `alg_cnv_${randomUUID()}`,
    messages: [{
      id: `alg_msg_${randomUUID()}`,
      role: "user",
      parts: [{ type: "text", text: question }],
    }],
    algolia: { indices },
  };
}

export function extractCompletionText(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";

  if (Array.isArray(payload.parts)) {
    const text = payload.parts
      .filter((part) => part && part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    if (text) return text;
  }

  const directCandidates = [
    payload.text,
    payload.content,
    payload.message?.content,
    payload.message?.text,
    payload.answer,
  ];
  const directText = directCandidates.find((candidate) => typeof candidate === "string");
  if (directText) return directText;

  if (Array.isArray(payload.choices)) {
    const choiceText = payload.choices
      .map((choice) => choice?.message?.content || choice?.text)
      .filter((text) => typeof text === "string")
      .join("");
    if (choiceText) return choiceText;
  }

  return "";
}

function metadataCandidate(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (typeof value === "object" && Object.keys(value).length === 0) return null;
  return value;
}

export function extractSearchToolMetadata(payload) {
  if (!payload || typeof payload !== "object") return null;

  const candidates = [
    payload.searchToolMetadata,
    payload.metadata?.searchTool,
    payload.metadata?.search,
    payload.toolCalls,
    payload.toolInvocations,
    payload.steps?.flatMap((step) => [step?.toolCalls, step?.toolInvocations]).filter(Boolean),
  ];
  return candidates.map(metadataCandidate).find(Boolean) || null;
}

export function extractExecutedSearchIndices(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.parts)) return [];

  const prefix = "tool-algolia_search_index_";
  return [...new Set(
    payload.parts
      .map((part) => part?.type)
      .filter((type) => typeof type === "string" && type.startsWith(prefix))
      .map((type) => type.slice(prefix.length))
      .filter(Boolean),
  )];
}

export function parseProviderBody(text, contentType = "") {
  if (contentType.includes("application/json")) return JSON.parse(text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function requestCompletion({ config, question, indices, fetchImpl = fetch, timeoutMs = 30_000 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(completionUrl(config), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": config.applicationId,
        "X-Algolia-API-Key": config.apiKey,
      },
      body: JSON.stringify(createCompletionPayload(question, indices)),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    const body = parseProviderBody(bodyText, response.headers.get("content-type") || "");
    if (!response.ok) {
      const providerMessage = typeof body === "string" ? body.slice(0, 500) : body?.message || body?.detail || "No provider error detail returned.";
      const error = new Error(`Agent Studio returned HTTP ${response.status}.`);
      error.statusCode = 502;
      error.providerStatus = response.status;
      error.providerBody = providerMessage;
      throw error;
    }

    return {
      text: extractCompletionText(body),
      searchToolMetadata: extractSearchToolMetadata(body),
      executedSearchIndices: extractExecutedSearchIndices(body),
      providerResponse: body,
    };
  } finally {
    clearTimeout(timeout);
  }
}
