import { args, agentSpec, algoliaBase, flag, loadDotEnv, optional, provisionAgent, required, rootDir, seedSupportIndex, syncVercelEnv, writeProvisionedEnv, indexExists } from "./provision-lib.mjs";

await loadDotEnv();
const options = args();

const applicationId = required("ALGOLIA_APPLICATION_ID");
const productIndex = required("ALGOLIA_PRODUCT_INDEX");
const supportIndex = "agent_studio_support_demo";
const catalogAgentEnvName = "DYNAMIC_ROUTING_CATALOG_AGENT_ID";
const supportAgentEnvName = "DYNAMIC_ROUTING_SUPPORT_AGENT_ID";
const legacyAgentId = optional("DYNAMIC_ROUTING_AGENT_STUDIO_AGENT_ID", "");
if (productIndex === supportIndex) throw new Error(`ALGOLIA_PRODUCT_INDEX must not be the generated support index: ${supportIndex}`);
const allowlist = [productIndex, supportIndex];

if (options.dryRun) {
  console.log("Dry run: no Algolia requests will be made.");
} else {
  const indexingKey = required("ALGOLIA_INDEXING_API_KEY");
  const base = algoliaBase(applicationId);
  if (!(await indexExists({ base, applicationId, apiKey: indexingKey, index: productIndex }))) {
    throw new Error(`Product index does not exist: ${productIndex}`);
  }
  if (!options.skipIndex) await seedSupportIndex({ base, applicationId, apiKey: indexingKey, index: supportIndex, dryRun: false });
}

const agentKey = options.dryRun ? optional("ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY", "<set in .env>") : required("ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY");
const providerId = optional("AGENT_STUDIO_PROVIDER_ID");
const model = optional("AGENT_STUDIO_MODEL");
const publish = options.publish || flag("PUBLISH_AGENTS");
function routeAgentSpec({ name, description, index, indexDescription }) {
  return agentSpec({
    name,
    description,
    providerId,
    model,
    instructions: "Answer questions using only the records returned by the configured Algolia Search tool. Do not invent facts when the search results do not contain them.",
    toolName: "approved_search",
    indices: [{ index, description: indexDescription }],
  });
}

const catalogSpec = routeAgentSpec({
  name: optional("AGENT_STUDIO_CATALOG_AGENT_NAME", optional("AGENT_STUDIO_AGENT_NAME", "Dynamic routing demo · product catalog")),
  description: "Direct Agent Studio demo agent scoped to the approved product catalog.",
  index: productIndex,
  indexDescription: "Product catalog used for product and shopping questions.",
});
const supportSpec = routeAgentSpec({
  name: optional("AGENT_STUDIO_SUPPORT_AGENT_NAME", "Dynamic routing demo · support knowledge"),
  description: "Direct Agent Studio demo agent scoped to the generated support knowledge index.",
  index: supportIndex,
  indexDescription: "Support knowledge base used for account, billing, and troubleshooting questions.",
});

const catalogAgent = { id: optional(catalogAgentEnvName, legacyAgentId) };
const supportAgent = { id: optional(supportAgentEnvName, "") };
if (!options.skipAgent) {
  Object.assign(catalogAgent, await provisionAgent({
    base: algoliaBase(applicationId),
    applicationId,
    apiKey: agentKey,
    agentId: catalogAgent.id,
    spec: catalogSpec,
    publish,
    dryRun: options.dryRun,
  }));
  Object.assign(supportAgent, await provisionAgent({
    base: algoliaBase(applicationId),
    applicationId,
    apiKey: agentKey,
    agentId: supportAgent.id,
    spec: supportSpec,
    publish,
    dryRun: options.dryRun,
  }));
}
const provisionedCatalogAgentId = catalogAgent.id || optional(catalogAgentEnvName, legacyAgentId);
const provisionedSupportAgentId = supportAgent.id || optional(supportAgentEnvName);

if (!options.dryRun) {
  const runtimeValues = {
    ALGOLIA_PRODUCT_INDEX: productIndex,
    ALGOLIA_SUPPORT_INDEX: supportIndex,
    ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
    DYNAMIC_ROUTING_CATALOG_AGENT_ID: provisionedCatalogAgentId,
    DYNAMIC_ROUTING_SUPPORT_AGENT_ID: provisionedSupportAgentId,
  };
  await writeProvisionedEnv(runtimeValues);
}
if (options.syncVercel && !options.dryRun && (!provisionedCatalogAgentId || !provisionedSupportAgentId)) throw new Error("Cannot sync Vercel until both scope-specific Agent Studio agent IDs exist. Remove --skip-agent or provide both generated IDs.");
if (options.syncVercel) await syncVercelEnv({
  ALGOLIA_APPLICATION_ID: applicationId,
  ALGOLIA_AGENT_STUDIO_API_KEY: options.dryRun ? "<runtime-key>" : required("ALGOLIA_AGENT_STUDIO_API_KEY"),
  ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
  DYNAMIC_ROUTING_CATALOG_AGENT_ID: options.dryRun ? "<created-catalog-agent-id>" : provisionedCatalogAgentId,
  DYNAMIC_ROUTING_SUPPORT_AGENT_ID: options.dryRun ? "<created-support-agent-id>" : provisionedSupportAgentId,
}, { dryRun: options.dryRun });

console.log(`\nNext runtime values ${options.dryRun ? "would be written to" : "were written to"} .env and provisioned.env:\nALGOLIA_INDEX_ALLOWLIST=${allowlist.join(",")}\nDYNAMIC_ROUTING_CATALOG_AGENT_ID=${provisionedCatalogAgentId || "<created-catalog-agent-id>"}\nDYNAMIC_ROUTING_SUPPORT_AGENT_ID=${provisionedSupportAgentId || "<created-support-agent-id>"}`);
console.log(`Generated values were ${options.dryRun ? "not written during the dry run" : `written to .env and provisioned.env in ${rootDir}`}.`);
