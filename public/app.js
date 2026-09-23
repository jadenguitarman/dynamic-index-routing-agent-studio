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
  result: document.querySelector("#result"),
  answer: document.querySelector("#answer"),
  evidence: document.querySelector("#evidence"),
  metadata: document.querySelector("#metadata"),
};

function selectedRoute() {
  return state.routes.find((route) => route.id === state.selectedRouteId) || null;
}

function renderRoutes() {
  elements.routes.replaceChildren();
  elements.routeEmpty.hidden = state.routes.length > 0;
  for (const route of state.routes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `route-card${route.id === state.selectedRouteId ? " selected" : ""}`;
    button.dataset.route = route.id;
    button.innerHTML = `<span class="route-radio" aria-hidden="true"></span><span class="route-copy"><strong>${route.label}</strong><small>${route.description}</small></span><span class="route-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener("click", () => {
      state.selectedRouteId = route.id;
      renderRoutes();
      renderDecision();
    });
    elements.routes.append(button);
  }
}

function renderDecision() {
  const route = selectedRoute();
  if (!route) {
    elements.decision.innerHTML = `<div class="decision-placeholder">Choose a context above to inspect the route and approved index set.</div>`;
    elements.run.disabled = true;
    return;
  }

  const multipleRoutes = state.routes.length > 1;
  elements.decision.innerHTML = `
    <div class="decision-route"><span class="decision-icon">${route.id === "catalog" ? "C" : "S"}</span><div><span class="meta-label">Selected route</span><strong>${route.label}</strong><small>${route.description}</small></div></div>
    <div class="decision-arrow" aria-hidden="true">→</div>
    <div class="index-set"><span class="meta-label">Approved index set</span><div class="index-list">${route.indices.map((index) => `<code>${index}</code>`).join("")}</div><small>${multipleRoutes ? "Resolved from the server-side allowlist for this context." : "One approved index is available; this shows request construction, not dynamic selection."}</small></div>
  `;
  elements.run.disabled = false;
}

function setError(message = "") {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function renderReadiness(data) {
  const ready = Object.values(data.readiness).every(Boolean);
  elements.status.textContent = ready ? "Ready to run" : "Config needed";
  elements.status.classList.toggle("warning", !ready);
}

function formatMetadata(metadata) {
  return metadata ? JSON.stringify(metadata, null, 2) : "Not returned by provider.";
}

function renderResult(data) {
  elements.result.hidden = false;
  elements.answer.textContent = data.answer;
  elements.evidence.innerHTML = `
    <div><dt>Route time</dt><dd>${data.timings.routeMs} ms</dd></div>
    <div><dt>Completion time</dt><dd>${data.timings.completionMs} ms</dd></div>
    <div><dt>Selected indices</dt><dd>${data.selectedIndices.map((index) => `<code>${index}</code>`).join(" ")}</dd></div>
    <div><dt>API</dt><dd>Agent Studio REST v${data.provider.apiVersion}</dd></div>
  `;
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
