import { args, agentSpec, algoliaBase, flag, loadDotEnv, optional, provisionAgent, required, rootDir, seedSupportIndex, syncVercelEnv, writeProvisionedEnv, indexExists } from "./provision-lib.mjs";

await loadDotEnv();
const options = args();

const applicationId = required("ALGOLIA_APPLICATION_ID");
const productIndex = required("ALGOLIA_PRODUCT_INDEX");
const supportIndex = "agent_studio_support_demo";
const agentEnvName = "DYNAMIC_ROUTING_AGENT_STUDIO_AGENT_ID";
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
const spec = agentSpec({
  name: optional("AGENT_STUDIO_AGENT_NAME", "Dynamic index routing demo"),
  description: "Direct Agent Studio demo where the application chooses an approved index set before a completion request.",
  providerId,
  model,
  instructions: "Answer questions using the Algolia Search tool. The application supplies the approved index set for each request. Do not invent catalog or support facts when the search results do not contain them.",
  toolName: "approved_search",
  mode: "dynamic",
  allowUnlistedIndices: true,
  indices: [
    { index: productIndex, description: "Product catalog used for product and shopping questions." },
    { index: supportIndex, description: "Support knowledge base used for account, billing, and troubleshooting questions." },
  ],
});

let agent = { id: optional(agentEnvName, "") };
if (!options.skipAgent) {
  agent = await provisionAgent({
    base: algoliaBase(applicationId),
    applicationId,
    apiKey: agentKey,
    agentId: optional(agentEnvName, ""),
    spec,
    publish,
    dryRun: options.dryRun,
  });
}
const provisionedAgentId = agent.id || optional(agentEnvName);

if (!options.dryRun) {
  const runtimeValues = {
    ALGOLIA_PRODUCT_INDEX: productIndex,
    ALGOLIA_SUPPORT_INDEX: supportIndex,
    ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
    [agentEnvName]: provisionedAgentId,
  };
  await writeProvisionedEnv(runtimeValues);
}
if (options.syncVercel && !options.dryRun && !provisionedAgentId) throw new Error(`Cannot sync Vercel until an Agent Studio agent ID exists. Remove --skip-agent or provide ${agentEnvName}.`);
if (options.syncVercel) await syncVercelEnv({
  ALGOLIA_APPLICATION_ID: applicationId,
  ALGOLIA_AGENT_STUDIO_API_KEY: options.dryRun ? "<runtime-key>" : required("ALGOLIA_AGENT_STUDIO_API_KEY"),
  ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
  [agentEnvName]: options.dryRun ? "<created-agent-id>" : provisionedAgentId,
}, { dryRun: options.dryRun });

console.log(`\nNext runtime values ${options.dryRun ? "would be written to" : "were written to"} .env and provisioned.env:\nALGOLIA_INDEX_ALLOWLIST=${allowlist.join(",")}\n${agentEnvName}=${provisionedAgentId || "<created-agent-id>"}`);
console.log(`Generated values were ${options.dryRun ? "not written during the dry run" : `written to .env and provisioned.env in ${rootDir}`}.`);
