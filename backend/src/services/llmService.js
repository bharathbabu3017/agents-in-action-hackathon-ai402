import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { config } from "dotenv";

config();

// Don't create the client at module load time - create it when needed

// Model configurations with FIXED pricing (no settlement needed)
export const MODEL_CONFIGS = {
  "apac.amazon.nova-micro-v1:0": {
    name: "Nova Micro",
    description: "Fastest, text-only model",
    price: 0.001, // $0.001 fixed price
    maxTokens: 500, // Up to 500 tokens included
    tokenLimit: 500, // Hard limit - truncate if exceeded
  },
  "apac.amazon.nova-lite-v1:0": {
    name: "Nova Lite",
    description: "Fast multimodal model",
    price: 0.002, // $0.002 fixed price
    maxTokens: 500, // Up to 500 tokens included
    tokenLimit: 500,
  },
  "apac.amazon.nova-pro-v1:0": {
    name: "Nova Pro",
    description: "Most capable model",
    price: 0.005, // $0.005 fixed price
    maxTokens: 1000, // Up to 1000 tokens included (premium)
    tokenLimit: 1000,
  },
};

/**
 * Create Bedrock client with current environment variables
 */
function createBedrockClient() {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Debug logging
  console.log("🔍 Creating Bedrock client with:");
  console.log(`  Region: ${region}`);
  console.log(
    `  Access Key ID: ${
      accessKeyId ? accessKeyId.substring(0, 8) + "..." : "MISSING"
    }`
  );
  console.log(`  Secret Key: ${secretAccessKey ? "***SET***" : "MISSING"}`);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(`Missing AWS credentials. Check your .env file:
      AWS_ACCESS_KEY_ID: ${accessKeyId ? "SET" : "MISSING"}
      AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? "SET" : "MISSING"}
      AWS_REGION: ${region}`);
  }

  return new BedrockRuntimeClient({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

/**
 * Get fixed price for a model (no calculation needed)
 */
export function getModelPrice(modelId) {
  const config = MODEL_CONFIGS[modelId];
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return config.price;
}

/**
 * Get token limit for a model
 */
export function getTokenLimit(modelId) {
  const config = MODEL_CONFIGS[modelId];
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return config.tokenLimit;
}

/**
 * Convert OpenAI format messages to Bedrock format
 */
function convertToBedrockFormat(messages) {
  return messages.map((message) => {
    // If content is already an array (Bedrock format), return as is
    if (Array.isArray(message.content)) {
      return message;
    }

    // Convert string content to Bedrock format
    return {
      role: message.role,
      content: [
        {
          text: message.content,
        },
      ],
    };
  });
}

/**
 * Call LLM with token limits enforced
 */
export async function callLLM(modelId, messages, options = {}) {
  try {
    const config = MODEL_CONFIGS[modelId];
    const { temperature = 0.7, maxTokens, ...otherOptions } = options;

    // Enforce our token limit
    const effectiveMaxTokens = Math.min(
      maxTokens || config.maxTokens,
      config.tokenLimit
    );

    console.log(`🤖 Calling ${modelId} (max ${effectiveMaxTokens} tokens)`);

    const client = createBedrockClient();

    // Convert messages to Bedrock format
    const bedrockMessages = convertToBedrockFormat(messages);
    console.log(`📝 Converted ${messages.length} messages to Bedrock format`);

    const response = await client.send(
      new ConverseCommand({
        modelId: modelId,
        messages: bedrockMessages,
        inferenceConfig: {
          temperature,
          maxTokens: effectiveMaxTokens, // Use our limit
          ...otherOptions,
        },
      })
    );

    const responseText = response.output.message.content
      .filter((content) => content.text)
      .map((content) => content.text)
      .join("\n");

    return {
      text: responseText,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        tokenLimit: config.tokenLimit,
        withinLimit: response.usage.totalTokens <= config.tokenLimit,
      },
      model: modelId,
      pricing: {
        fixedPrice: config.price,
        tokensIncluded: config.tokenLimit,
        description: `$${config.price} for up to ${config.tokenLimit} tokens`,
      },
    };
  } catch (error) {
    console.error(`❌ LLM call failed for ${modelId}:`, error);

    if (error.message.includes("credential")) {
      throw new Error(`AWS credentials error: ${error.message}`);
    }

    throw new Error(`LLM generation failed: ${error.message}`);
  }
}
