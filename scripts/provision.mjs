import { args, agentSpec, algoliaBase, flag, loadDotEnv, optional, provisionAgent, required, rootDir, seedSupportIndex, writeProvisionedEnv, indexExists } from "./provision-lib.mjs";

await loadDotEnv();
const options = args();

const applicationId = required("ALGOLIA_APPLICATION_ID");
const productIndex = required("ALGOLIA_PRODUCT_INDEX");
const supportIndex = optional("ALGOLIA_SUPPORT_INDEX", "agent_studio_support_demo");
const allowlist = optional("ALGOLIA_INDEX_ALLOWLIST", `${productIndex},${supportIndex}`)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (!allowlist.includes(productIndex) || !allowlist.includes(supportIndex)) {
  throw new Error(`ALGOLIA_INDEX_ALLOWLIST must include both ${productIndex} and ${supportIndex}.`);
}

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

let agent = { id: optional("AGENT_STUDIO_AGENT_ID", "") };
if (!options.skipAgent) {
  agent = await provisionAgent({
    base: algoliaBase(applicationId),
    applicationId,
    apiKey: agentKey,
    agentId: optional("AGENT_STUDIO_AGENT_ID", ""),
    spec,
    publish,
    dryRun: options.dryRun,
  });
}

if (!options.dryRun) {
  await writeProvisionedEnv({
    ALGOLIA_PRODUCT_INDEX: productIndex,
    ALGOLIA_SUPPORT_INDEX: supportIndex,
    ALGOLIA_INDEX_ALLOWLIST: allowlist.join(","),
    AGENT_STUDIO_AGENT_ID: agent.id,
  });
}

console.log(`\nNext runtime values:\nALGOLIA_INDEX_ALLOWLIST=${allowlist.join(",")}\nAGENT_STUDIO_AGENT_ID=${agent.id || "<created-agent-id>"}`);
console.log(`provisioned.env was ${options.dryRun ? "not written during the dry run" : `written in ${rootDir}`}.`);
