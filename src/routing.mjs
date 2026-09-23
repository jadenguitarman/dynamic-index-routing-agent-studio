const ROUTE_DEFINITIONS = [
  {
    id: "catalog",
    label: "Product catalog",
    description: "A product-oriented test index or partition for discovery questions.",
    context: "catalog",
    indexPosition: 0,
  },
  {
    id: "support",
    label: "Support knowledge",
    description: "A support-oriented test index or partition for troubleshooting questions.",
    context: "support",
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
