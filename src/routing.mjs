const ROUTE_DEFINITIONS = [
  {
    id: "catalog",
    label: "Product catalog",
    description: "A product-oriented test index or partition for discovery questions.",
    context: "catalog",
    agentLabel: "One dynamic Agent Studio agent",
    contextSignal: "Product page or shopping journey",
    examples: [
      "What compact printers are available?",
      "Which products would work for a small home office?",
    ],
    indexPosition: 0,
  },
  {
    id: "support",
    label: "Support knowledge",
    description: "A support-oriented test index or partition for troubleshooting questions.",
    context: "support",
    agentLabel: "One dynamic Agent Studio agent",
    contextSignal: "Support page or account question",
    examples: [
      "What should I check if SAML login fails?",
      "How do I change my plan?",
    ],
    indexPosition: 1,
  },
];

export function buildRouteMap(approvedIndices) {
  return ROUTE_DEFINITIONS.flatMap((definition) => {
    const index = approvedIndices[definition.indexPosition];
    if (!index) return [];

    return [{
      id: definition.id,
      label: definition.label,
      description: definition.description,
      context: definition.context,
      agentLabel: definition.agentLabel,
      contextSignal: definition.contextSignal,
      examples: definition.examples,
      indices: [index],
    }];
  });
}

export function resolveRoute(routeId, approvedIndices) {
  const routes = buildRouteMap(approvedIndices);
  const route = routes.find((candidate) => candidate.id === routeId);
  if (!route) {
    const error = new Error(`Unknown route: ${routeId || "(empty)"}`);
    error.statusCode = 400;
    throw error;
  }
  return route;
}

export function assertApprovedIndices(indices, approvedIndices) {
  if (!Array.isArray(indices) || indices.length === 0) {
    const error = new Error("A route must resolve to at least one approved index.");
    error.statusCode = 500;
    throw error;
  }

  const rejected = indices.filter((index) => !approvedIndices.includes(index));
  if (rejected.length > 0) {
    const error = new Error(`Unallowlisted index: ${rejected.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}
