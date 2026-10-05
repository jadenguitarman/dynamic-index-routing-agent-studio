const state = {
  routes: [],
  selectedRouteId: "",
  publicConfig: null,
};

const elements = {
  routes: document.querySelector("#routes"),
  routeEmpty: document.querySelector("#route-empty"),
  status: document.querySelector("#config-status"),
  question: document.querySelector("#question"),
  run: document.querySelector("#run"),
  error: document.querySelector("#error"),
  decision: document.querySelector("#decision-content"),
  examples: document.querySelector("#examples"),
  requestPayload: document.querySelector("#request-payload"),
  result: document.querySelector("#result"),
  answer: document.querySelector("#answer"),
  evidence: document.querySelector("#evidence"),
  scopeCheck: document.querySelector("#scope-check"),
  metadata: document.querySelector("#metadata"),
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = `route-card${route.id === state.selectedRouteId ? " selected" : ""}`;
    button.dataset.route = route.id;
    button.innerHTML = `<span class="route-radio" aria-hidden="true"></span><span class="route-copy"><strong>${route.label}</strong><small>${route.contextSignal}</small><span>${route.description}</span></span><span class="route-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener("click", () => {
      state.selectedRouteId = route.id;
      renderRoutes();
      renderDecision();
    });
    elements.routes.append(button);
  }
}

function renderExamples() {
  const route = selectedRoute();
  elements.examples.replaceChildren();
  if (!route) return;

  for (const example of route.examples || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-button";
    button.textContent = example;
    button.addEventListener("click", () => {
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
  elements.run.disabled = false;
}

function setError(message = "") {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function renderReadiness(data) {
  const ready = data.readiness.applicationId
    && data.readiness.apiKey
    && data.readiness.indices
    && data.readiness.agent;
  elements.status.textContent = ready ? "Ready to run" : "Config needed";
  elements.status.classList.toggle("warning", !ready);
}

function formatMetadata(metadata) {
  return metadata ? JSON.stringify(metadata, null, 2) : "Not returned by provider.";
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
  elements.result.hidden = false;
  elements.answer.textContent = data.answer;
  const executedSearchIndices = Array.isArray(data.executedSearchIndices) ? data.executedSearchIndices : [];
  elements.evidence.innerHTML = `
    <div><dt>Route time</dt><dd>${data.timings.routeMs} ms</dd></div>
    <div><dt>Completion time</dt><dd>${data.timings.completionMs} ms</dd></div>
    <div><dt>Configured scope</dt><dd>${formatIndexList(data.selectedIndices)}</dd></div>
    <div><dt>Agent Studio searched</dt><dd>${formatIndexList(executedSearchIndices)}</dd></div>
    <div><dt>API</dt><dd>Agent Studio REST v${data.provider.apiVersion}</dd></div>
  `;
  renderScopeCheck(data.selectedIndices, executedSearchIndices);
  elements.metadata.textContent = formatMetadata(data.searchToolMetadata);
  elements.result.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadRoutes() {
  try {
    const response = await fetch("/api/routes");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load routes.");
    state.routes = data.routes;
    state.publicConfig = data;
    state.selectedRouteId = state.routes[0]?.id || "";
    renderReadiness(data);
    renderRoutes();
    renderDecision();
  } catch (error) {
    setError(error.message);
    elements.status.textContent = "Unavailable";
    elements.status.classList.add("warning");
  }
}

async function runCompletion() {
  const route = selectedRoute();
  if (!route) return;
  setError();
  elements.run.disabled = true;
  elements.run.classList.add("loading");
  elements.run.innerHTML = "Running <span class=\"spinner\" aria-hidden=\"true\"></span>";
  try {
    const response = await fetch("/api/completion", {
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
    elements.run.disabled = false;
    elements.run.classList.remove("loading");
    elements.run.innerHTML = "Run completion <span aria-hidden=\"true\">↗</span>";
  }
}

elements.run.addEventListener("click", runCompletion);
loadRoutes();
