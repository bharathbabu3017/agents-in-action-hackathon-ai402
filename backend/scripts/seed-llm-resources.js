import mongoose from "mongoose";
import { config } from "dotenv";
import Resource from "../src/models/Resource.js";

config();

// Model configurations with FIXED pricing (no settlement needed)
const MODEL_CONFIGS = {
  "apac.amazon.nova-micro-v1:0": {
    name: "Nova Micro",
    description:
      "Text-only model with lowest latency and cost. Ideal for fast language tasks, code completion, and reasoning.",
    price: 0.001,
    maxTokens: 500,
  },
  "apac.amazon.nova-lite-v1:0": {
    name: "Nova Lite",
    description:
      "Low-cost multimodal model for fast processing of text, image, and video inputs. Great for high-volume applications.",
    price: 0.002,
    maxTokens: 500,
  },
  "apac.amazon.nova-pro-v1:0": {
    name: "Nova Pro",
    description:
      "Highly capable multimodal model with optimal balance of accuracy, speed, and cost. Excels at complex tasks and AI agents.",
    price: 0.005,
    maxTokens: 1000,
  },
};

async function seedLLMResources() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📊 Connected to MongoDB");

    // Delete existing LLM resources first
    await Resource.deleteMany({ type: "ai_model" });
    console.log("🗑️  Cleaned up existing LLM resources");

    const creatorAddress =
      process.env.ADDRESS || "0xe8faD77E45dfb4127d4b484a85cc6047CF012935";

    for (const [modelId, config] of Object.entries(MODEL_CONFIGS)) {
      const resourceId = crypto.randomUUID();

      const resource = new Resource({
        id: resourceId,
        name: config.name,
        description: `${config.description}`,
        type: "ai_model",
        category: "llm",
        creatorAddress: creatorAddress,
        originalUrl: `https://bedrock.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com`,
        pricing: {
          model: "per_call",
          defaultAmount: config.price,
        },
        llmConfig: {
          modelId: modelId,
          provider: "bedrock",
          region: process.env.AWS_REGION || "us-east-1",
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
        },
        isActive: true,
      });

      await resource.save();
      console.log(`✅ Created LLM resource: ${config.name} (${resourceId})`);
      console.log(
        `📋 Proxy URL: http://localhost:3001/proxy/${resourceId}/chat`
      );
      console.log(
        `💰 Pricing: $${config.price}/1K input, $${config.price}/1K output, min $${config.price}`
      );
      console.log("");
    }

    console.log("🎉 All LLM resources created successfully!");
    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error seeding LLM resources:", error);
    mongoose.disconnect();
    process.exit(1);
  }
}

seedLLMResources();
