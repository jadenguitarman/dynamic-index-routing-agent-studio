import { args, agentSpec, algoliaBase, flag, loadDotEnv, optional, provisionAgent, required, rootDir, seedSupportIndex, syncVercelEnv, writeProvisionedEnv, indexExists } from "./provision-lib.mjs";

await loadDotEnv();
const options = args();

const applicationId = required("ALGOLIA_APPLICATION_ID");
const productIndex = required("ALGOLIA_PRODUCT_INDEX");
const supportIndex = "agent_studio_support_demo";
const agentEnvName = "DYNAMIC_ROUTING_AGENT_ID";
const existingAgentId = optional(agentEnvName, optional("DYNAMIC_ROUTING_CATALOG_AGENT_ID", optional("DYNAMIC_ROUTING_AGENT_STUDIO_AGENT_ID", "")));
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
const dynamicAgentSpec = agentSpec({
  name: optional("AGENT_STUDIO_AGENT_NAME", "Dynamic index routing demo"),
  description: "Direct Agent Studio demo agent whose approved search scope is selected per request by the server.",
  providerId,
  model,
  instructions: "Answer questions using only records returned by the Algolia Search tool. The application selects the request scope. Do not invent facts when the selected search results do not contain them.",
  toolName: "approved_search",
  mode: "dynamic",
  indices: [
    { index: productIndex, description: "Product catalog used for product and shopping questions." },
    { index: supportIndex, description: "Support knowledge base used for account, billing, and troubleshooting questions." },
  ],
});

const dynamicAgent = { id: existingAgentId };
if (!options.skipAgent) {
  Object.assign(dynamicAgent, await provisionAgent({
    base: algoliaBase(applicationId),
    applicationId,
    apiKey: agentKey,
    agentId: dynamicAgent.id,
    spec: dynamicAgentSpec,
    publish,
    dryRun: options.dryRun,
  }));
}
const provisionedAgentId = dynamicAgent.id || optional(agentEnvName, existingAgentId);

if (!options.dryRun) {
  const runtimeValues = {
    ALGOLIA_PRODUCT_INDEX: productIndex,
    ALGOLIA_SUPPORT_INDEX: supportIndex,
    ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
    DYNAMIC_ROUTING_AGENT_ID: provisionedAgentId,
  };
  await writeProvisionedEnv(runtimeValues);
}
if (options.syncVercel && !options.dryRun && !provisionedAgentId) throw new Error("Cannot sync Vercel until the dynamic Agent Studio agent ID exists. Remove --skip-agent or provide DYNAMIC_ROUTING_AGENT_ID.");
if (options.syncVercel) await syncVercelEnv({
  ALGOLIA_APPLICATION_ID: applicationId,
  ALGOLIA_AGENT_STUDIO_API_KEY: options.dryRun ? "<runtime-key>" : required("ALGOLIA_AGENT_STUDIO_API_KEY"),
  ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
  DYNAMIC_ROUTING_AGENT_ID: options.dryRun ? "<created-dynamic-agent-id>" : provisionedAgentId,
}, { dryRun: options.dryRun });

console.log(`\nNext runtime values ${options.dryRun ? "would be written to" : "were written to"} .env and provisioned.env:\nALGOLIA_INDEX_ALLOWLIST=${allowlist.join(",")}\nDYNAMIC_ROUTING_AGENT_ID=${provisionedAgentId || "<created-dynamic-agent-id>"}`);
console.log(`Generated values were ${options.dryRun ? "not written during the dry run" : `written to .env and provisioned.env in ${rootDir}`}.`);
