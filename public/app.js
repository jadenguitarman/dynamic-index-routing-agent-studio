import { renderMarkdown } from "./markdown.js";

const demoRoot = window.__DYNAMIC_ROUTING_DEMO_ROOT__ || document;
const demoOrigin = String(window.__DYNAMIC_ROUTING_DEMO_ORIGIN__ || "").replace(/\/+$/, "");
const demoUrl = (path) => `${demoOrigin}${path}`;
const query = (selector) => demoRoot.querySelector(selector);

const state = {
  routes: [],
  selectedRouteId: "",
  publicConfig: null,
  isRunning: false,
};

const elements = {
  routes: query("#routes"),
  routeEmpty: query("#route-empty"),
  question: query("#question"),
  run: query("#run"),
  error: query("#error"),
  decision: query("#decision-content"),
  examples: query("#examples"),
  requestPayload: query("#request-payload"),
  answerCard: query("#answer-card"),
  answer: query("#answer"),
  detailsHint: query("#details-hint"),
  evidence: query("#evidence"),
  scopeEvidence: query("#scope-evidence"),
  scopeCheck: query("#scope-check"),
  evidenceSection: query("#evidence-section"),
};

function selectedRoute() {
  return state.routes.find((route) => route.id === state.selectedRouteId) || null;
}

function formatIndexList(indices) {
  return indices.length > 0
    ? indices.map((index) => `<code>${index}</code>`).join(" ")
    : "<span class=\"muted-value\">No search index</span>";
}

function renderRoutes() {
  elements.routes.replaceChildren();
  elements.routeEmpty.hidden = state.routes.length > 0;
  for (const route of state.routes) {
    const card = document.createElement("label");
    card.className = `route-card${route.id === state.selectedRouteId ? " selected" : ""}`;
    card.dataset.route = route.id;
    card.innerHTML = `<input class="route-radio-input" type="radio" name="context" value="${route.id}"${route.id === state.selectedRouteId ? " checked" : ""}${state.isRunning ? " disabled" : ""}><span class="route-choice" aria-hidden="true"><span class="route-choice-mark"></span></span><span class="route-copy"><strong>${route.label}</strong><small>${route.contextSignal}</small><span>${route.description}</span></span><span class="route-arrow" aria-hidden="true">↗</span>`;
    card.querySelector("input").addEventListener("change", () => {
      state.selectedRouteId = route.id;
      clearResult();
      renderRoutes();
      renderDecision();
    });
    elements.routes.append(card);
  }
}

function renderExamples() {
  const route = selectedRoute();
  elements.examples.replaceChildren();
  if (!route) return;

  for (const example of route.examples || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = state.isRunning;
    button.className = "example-button";
    button.textContent = example;
    button.addEventListener("click", () => {
      if (state.isRunning) return;
      elements.question.value = example;
      elements.question.focus();
    });
    elements.examples.append(button);
  }
}

function renderDecision() {
  const route = selectedRoute();
  if (!route) {
    elements.decision.innerHTML = `<div class="decision-placeholder">Choose a context above to see how the application narrows the search scope for the same Agent Studio agent.</div>`;
    elements.requestPayload.textContent = "Select a context to inspect the server routing record.";
    renderExamples();
    elements.run.disabled = true;
    return;
  }

  elements.decision.innerHTML = `
    <div class="decision-step"><span class="meta-label">Context signal</span><strong>${route.contextSignal}</strong><small>${route.description}</small></div>
    <div class="decision-arrow" aria-hidden="true">→</div>
    <div class="decision-step"><span class="meta-label">Route alias</span><strong><code>${route.id}</code></strong><small>Readable application context, not an index name.</small></div>
    <div class="decision-arrow" aria-hidden="true">→</div>
    <div class="decision-step"><span class="meta-label">Request scope</span><div class="index-list">${formatIndexList(route.indices)}</div><small>Sent as <code>algolia.indices</code> to the same agent.</small></div>
  `;
  elements.requestPayload.textContent = JSON.stringify({ route: route.id, agent: route.agentLabel, algolia: { indices: route.indices } }, null, 2);
  renderExamples();
  elements.run.disabled = state.isRunning;
}

function setError(message = "") {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function clearResult() {
  elements.answerCard.hidden = true;
  elements.detailsHint.hidden = true;
  elements.evidenceSection.hidden = true;
  elements.answer.textContent = "";
  elements.evidence.replaceChildren();
  elements.scopeEvidence.replaceChildren();
  elements.scopeCheck.hidden = true;
}

function comparableIndexName(index) {
  return index.replaceAll("-", "_");
}

function renderScopeCheck(selectedIndices, executedIndices) {
  const selectedComparableNames = new Set(selectedIndices.map(comparableIndexName));
  const unexpected = executedIndices.filter((index) => !selectedComparableNames.has(comparableIndexName(index)));
  elements.scopeCheck.hidden = false;
  elements.scopeCheck.className = `scope-check ${unexpected.length > 0 ? "mismatch" : "matched"}`;
  if (unexpected.length > 0) {
    elements.scopeCheck.innerHTML = `<strong>Scope mismatch detected</strong><span>Agent Studio searched ${formatIndexList(unexpected)} even though the server requested a narrower scope.</span>`;
    return;
  }
  if (executedIndices.length === 0) {
    elements.scopeCheck.innerHTML = "<strong>No search tool call reported</strong><span>The agent answered without a reported Algolia search.</span>";
    return;
  }
    elements.scopeCheck.innerHTML = `<strong>Scope matched</strong><span>The same Agent Studio agent searched only ${formatIndexList(executedIndices)} from the server-selected request scope.</span>`;
}

function renderResult(data) {
  elements.answerCard.hidden = false;
  elements.answer.innerHTML = renderMarkdown(data.answer);
  const executedSearchIndices = Array.isArray(data.executedSearchIndices) ? data.executedSearchIndices : [];
  elements.evidence.innerHTML = `
    <div><dt>Routing</dt><dd>${data.timings.routeMs} ms</dd></div>
    <div><dt>Generation</dt><dd>${data.timings.completionMs} ms</dd></div>
    <div><dt>Total</dt><dd>${data.timings.totalMs} ms</dd></div>
  `;
  elements.scopeEvidence.innerHTML = `
    <div><dt>Requested scope</dt><dd>${formatIndexList(data.selectedIndices)}</dd></div>
    <div><dt>Searched index</dt><dd>${formatIndexList(executedSearchIndices)}</dd></div>
  `;
  renderScopeCheck(data.selectedIndices, executedSearchIndices);
  elements.evidenceSection.hidden = false;
  elements.detailsHint.hidden = false;
}

async function loadRoutes() {
  try {
    const response = await fetch(demoUrl("/api/routes"));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load routes.");
    state.routes = data.routes;
    state.publicConfig = data;
    state.selectedRouteId = state.routes[0]?.id || "";
    renderRoutes();
    renderDecision();
    window.dispatchEvent(new CustomEvent("dynamic-routing-demo-ready", { detail: { root: demoRoot } }));
  } catch (error) {
    setError(error.message);
    window.dispatchEvent(new CustomEvent("dynamic-routing-demo-error", { detail: { root: demoRoot, error } }));
  }
}

async function runCompletion() {
  const route = selectedRoute();
  if (!route || state.isRunning) return;
  state.isRunning = true;
  clearResult();
  setError();
  elements.run.disabled = true;
  elements.run.classList.add("loading");
  elements.run.innerHTML = "Running <span class=\"spinner\" aria-hidden=\"true\"></span>";
  try {
    const response = await fetch(demoUrl("/api/completion"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: route.id, question: elements.question.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Completion failed.");
    renderResult(data);
  } catch (error) {
    setError(error.message);
  } finally {
    state.isRunning = false;
    renderRoutes();
    renderExamples();
    renderDecision();
    elements.run.classList.remove("loading");
    elements.run.textContent = "Send to the agent";
  }
}

elements.run.addEventListener("click", runCompletion);
loadRoutes();
