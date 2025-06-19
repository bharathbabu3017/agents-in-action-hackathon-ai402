import mongoose from "mongoose";
import { config } from "dotenv";
import Resource from "../../../src/models/Resource.js";

config();

const LLM_MODELS = [
  {
    name: "Nova Micro",
    description:
      "Amazon's fastest text-only model, optimized for speed and efficiency",
    originalUrl: "https://bedrock.us-east-1.amazonaws.com/chat",
    creatorAddress: "0xe8faD77E45dfb4127d4b484a85cc6047CF012935",
    category: "ai",
    tags: ["llm", "amazon", "bedrock", "fast", "text-only"],
    llmConfig: {
      modelId: "apac.amazon.nova-micro-v1:0",
      provider: "bedrock",
      region: "us-east-1",
      defaultTemperature: 0.7,
      defaultMaxTokens: 500,
    },
    pricing: {
      model: "per_call",
      defaultAmount: 0.001, // $0.001 for up to 500 tokens
      tokenPricing: {
        inputTokenPrice: 0.000035, // $0.035 per 1K tokens
        outputTokenPrice: 0.00014, // $0.14 per 1K tokens
        maxTokens: 500,
      },
    },
  },
  {
    name: "Nova Lite",
    description: "Fast multimodal model supporting text and images",
    originalUrl: "https://bedrock.us-east-1.amazonaws.com/chat",
    creatorAddress: "0xe8faD77E45dfb4127d4b484a85cc6047CF012935",
    category: "ai",
    tags: ["llm", "amazon", "bedrock", "multimodal", "images"],
    llmConfig: {
      modelId: "apac.amazon.nova-lite-v1:0",
      provider: "bedrock",
      region: "us-east-1",
      defaultTemperature: 0.7,
      defaultMaxTokens: 1000,
    },
    pricing: {
      model: "per_call",
      defaultAmount: 0.002, // $0.002 for up to 1000 tokens
      tokenPricing: {
        inputTokenPrice: 0.00006, // $0.06 per 1K tokens
        outputTokenPrice: 0.00024, // $0.24 per 1K tokens
        maxTokens: 1000,
      },
    },
  },
  {
    name: "Nova Pro",
    description:
      "Most capable model with advanced reasoning and complex task handling",
    originalUrl: "https://bedrock.us-east-1.amazonaws.com/chat",
    creatorAddress: "0xe8faD77E45dfb4127d4b484a85cc6047CF012935",
    category: "ai",
    tags: ["llm", "amazon", "bedrock", "advanced", "reasoning"],
    llmConfig: {
      modelId: "apac.amazon.nova-pro-v1:0",
      provider: "bedrock",
      region: "us-east-1",
      defaultTemperature: 0.7,
      defaultMaxTokens: 2000,
    },
    pricing: {
      model: "per_call",
      defaultAmount: 0.005, // $0.005 for up to 2000 tokens
      tokenPricing: {
        inputTokenPrice: 0.0008, // $0.80 per 1K tokens
        outputTokenPrice: 0.0032, // $3.20 per 1K tokens
        maxTokens: 2000,
      },
    },
  },
];

async function seedLLMResources() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n🤖 Seeding LLM Model Resources...");

    for (const modelData of LLM_MODELS) {
      console.log(`\n🧠 Processing: ${modelData.name}`);

      // Check if resource already exists
      const existing = await Resource.findOne({ name: modelData.name });

      if (existing) {
        console.log(`♻️  Updating existing resource: ${existing.id}`);
        Object.assign(existing, {
          ...modelData,
          type: "ai_model",
          isActive: true,
        });
        await existing.save();

        console.log(`✅ Updated: ${modelData.name}`);
        console.log(`   ID: ${existing.id}`);
        console.log(`   Model: ${existing.llmConfig.modelId}`);
        console.log(`   Original URL: ${existing.originalUrl}`);
        console.log(`   Proxy URL: ${existing.proxyUrl}`);
        console.log(
          `   Price: $${existing.pricing.defaultAmount} (${existing.llmConfig.defaultMaxTokens} tokens)`
        );
      } else {
        console.log(`🆕 Creating new resource...`);
        const resource = new Resource({
          ...modelData,
          type: "ai_model",
          isActive: true,
        });
        await resource.save();

        console.log(`✅ Created: ${modelData.name}`);
        console.log(`   ID: ${resource.id}`);
        console.log(`   Model: ${resource.llmConfig.modelId}`);
        console.log(`   Original URL: ${resource.originalUrl}`);
        console.log(`   Proxy URL: ${resource.proxyUrl}`);
        console.log(
          `   Price: $${resource.pricing.defaultAmount} (${resource.llmConfig.defaultMaxTokens} tokens)`
        );
      }
    }

    console.log(`\n🎯 Seeding Summary:`);
    console.log(`   Total LLM models: ${LLM_MODELS.length}`);
    console.log(
      `   Providers: ${[
        ...new Set(LLM_MODELS.map((m) => m.llmConfig.provider)),
      ].join(", ")}`
    );
    console.log(
      `   Price range: $${Math.min(
        ...LLM_MODELS.map((m) => m.pricing.defaultAmount)
      )} - $${Math.max(...LLM_MODELS.map((m) => m.pricing.defaultAmount))}`
    );

    console.log(`\n🧪 Test your LLM models:`);
    console.log(`   # Get all resources`);
    console.log(`   curl http://localhost:3001/api/resources`);
    console.log(`\n   # Test LLM chat (will get 402, then pay via x402-axios)`);
    console.log(
      `   curl -X POST http://localhost:3001/proxy/{resource-id}/chat \\`
    );
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(
      `     -d '{"messages":[{"role":"user","content":[{"text":"Hello!"}]}]}'`
    );
  } catch (error) {
    console.error("❌ Error seeding LLM resources:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedLLMResources().catch(console.error);
}
