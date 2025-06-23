import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import { exact } from "x402/schemes";
import { settleResponseHeader } from "x402/types";
import { useFacilitator } from "x402/verify";
import { processPriceToAtomicAmount } from "x402/shared";
import Resource from "./models/Resource.js";
import resourceRoutes from "./routes/resources.js";
import playgroundRoutes from "./routes/playground.js";
import {
  callLLM,
  getModelPrice,
  getTokenLimit,
} from "./services/llmService.js";

config();

const app = express();

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("📊 Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware - Allow all origins for hackathon demo
app.use(cors());
app.use(express.json());

// Configure x402 payment verification
const facilitatorUrl = process.env.FACILITATOR_URL;

if (!facilitatorUrl) {
  console.error("❌ Missing FACILITATOR_URL");
  process.exit(1);
}

const { verify, settle } = useFacilitator({ url: facilitatorUrl });
const x402Version = 1;

/**
 * Creates payment requirements for a given price and network
 */
function createExactPaymentRequirements(
  price,
  network,
  resource,
  payTo,
  description = ""
) {
  const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
  if ("error" in atomicAmountForAsset) {
    throw new Error(atomicAmountForAsset.error);
  }
  const { maxAmountRequired, asset } = atomicAmountForAsset;

  return {
    scheme: "exact",
    network,
    maxAmountRequired,
    resource,
    description,
    mimeType: "",
    payTo: payTo,
    maxTimeoutSeconds: 60,
    asset: asset.address,
    outputSchema: undefined,
    extra: {
      name: asset.eip712.name,
      version: asset.eip712.version,
    },
  };
}

/**
 * Verifies a payment and handles the response - WITH SETTLEMENT
 */
async function verifyPayment(req, res, paymentRequirements) {
  const payment = req.header("X-PAYMENT");
  if (!payment) {
    res.status(402).json({
      x402Version,
      error: "X-PAYMENT header is required",
      accepts: paymentRequirements,
    });
    return false;
  }

  let decodedPayment;
  try {
    decodedPayment = exact.evm.decodePayment(payment);
    decodedPayment.x402Version = x402Version;
    console.log("🔍 Decoded payment:", {
      scheme: decodedPayment.scheme,
      network: decodedPayment.network,
      hasPayload: !!decodedPayment.payload,
    });
  } catch (error) {
    console.error("❌ Payment decoding error:", error);
    res.status(402).json({
      x402Version,
      error: `Invalid or malformed payment header: ${error.message || error}`,
      accepts: paymentRequirements,
    });
    return false;
  }

  try {
    console.log(
      "🔍 Verifying payment against requirements:",
      paymentRequirements[0]
    );
    const response = await verify(decodedPayment, paymentRequirements[0]);
    console.log("🔍 Verification response:", response);

    if (!response.isValid) {
      console.log("❌ Payment verification failed:", response.invalidReason);
      res.status(402).json({
        x402Version,
        error: response.invalidReason || "Payment verification failed",
        accepts: paymentRequirements,
        payer: response.payer,
      });
      return false;
    }

    console.log("✅ Payment verification successful");

    // NOW ACTUALLY SETTLE THE PAYMENT ON BLOCKCHAIN
    console.log("💳 Settling payment on blockchain...");
    const settleResponse = await settle(decodedPayment, paymentRequirements[0]);
    console.log("🔍 Settlement response:", settleResponse);

    if (!settleResponse || settleResponse.error) {
      console.error("❌ Payment settlement failed:", settleResponse?.error);
      res.status(402).json({
        x402Version,
        error:
          "Payment settlement failed: " +
          (settleResponse?.error || "Unknown error"),
        accepts: paymentRequirements,
      });
      return false;
    }

    console.log("✅ Payment settlement successful!");
    console.log("💰 Blockchain transaction:", settleResponse.transaction);

    // Add settlement response header
    const responseHeader = settleResponseHeader(settleResponse);
    res.setHeader("X-PAYMENT-RESPONSE", responseHeader);

    // Store settlement details for later use in transaction saving
    req.settlementDetails = {
      txHash: settleResponse.transaction,
      blockNumber: settleResponse.blockNumber,
      gasUsed: settleResponse.gasUsed,
      fromAddress: settleResponse.payer || response.payer,
      network: settleResponse.network,
    };

    return true;
  } catch (error) {
    console.error("❌ Payment verification/settlement error:", error);
    res.status(402).json({
      x402Version,
      error: `Payment processing failed: ${error.message || error}`,
      accepts: paymentRequirements,
    });
    return false;
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "AI402 Backend is running!",
  });
});

// Routes (order matters - proxy routes need to be before payment middleware)
app.use("/api/resources", resourceRoutes);
app.use("/api/playground", playgroundRoutes);

// Handle all proxy requests with dynamic payment verification
app.all("/proxy/:resourceId/*", async (req, res) => {
  try {
    const { resourceId } = req.params;
    const path = req.params[0] || "";

    console.log(
      `🔄 Proxy request: ${resourceId}, path: ${path}, method: ${req.method}`
    );

    // Get resource configuration from database
    const resource = await Resource.findOne({ id: resourceId });
    if (!resource) {
      return res.status(404).json({
        error: "Resource not found",
        resourceId,
      });
    }

    console.log(`📡 Proxying to: ${resource.originalUrl}`);

    // ✅ MCP SERVERS: Only gate tools/call, allow EVERYTHING else
    if (resource.type === "mcp_server") {
      // Handle all HTTP methods (GET, POST, etc.) for MCP
      let mcpMethod = null;

      // Extract method from request body (for POST) or headers
      if (req.method === "POST" && req.body && req.body.method) {
        mcpMethod = req.body.method;
      }

      // 💰 ONLY gatekeep tools/call - everything else is FREE
      if (mcpMethod === "tools/call") {
        console.log("💰 MCP tools/call request - checking payment...");

        const { params } = req.body;
        if (!params || !params.name) {
          return res.status(400).json({
            error: "Invalid MCP tools/call request format",
            expected:
              "{ jsonrpc: '2.0', method: 'tools/call', params: { name: string, arguments: object } }",
          });
        }

        const toolName = params.name;
        let toolPrice = resource.pricing.defaultAmount;

        // Check for per-tool pricing
        if (
          resource.pricing.model === "per_tool" &&
          resource.pricing.toolPricing &&
          resource.pricing.toolPricing.has(toolName)
        ) {
          toolPrice = resource.pricing.toolPricing.get(toolName);
        }

        console.log(`💰 Tool pricing: ${toolName} costs $${toolPrice}`);

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const resourceUrl = `${baseUrl}/proxy/${resourceId}/${path}`;

        const paymentRequirements = [
          createExactPaymentRequirements(
            `$${toolPrice}`,
            "base-sepolia",
            resourceUrl,
            resource.creatorAddress,
            `${resource.name} - ${toolName}`
          ),
        ];

        const isValid = await verifyPayment(req, res, paymentRequirements);
        if (!isValid) return;

        console.log("✅ Payment verified, executing MCP tool call...");
      } else {
        // 🆓 ALL other MCP methods are FREE (initialize, tools/list, capabilities, etc.)
        console.log(
          `🆓 Free MCP request: ${mcpMethod || req.method + " " + path}`
        );
      }

      // 🔄 Forward ALL MCP requests (both free and paid) to original server
      try {
        const { forwardToOriginalAPI } = await import(
          "./services/proxyService.js"
        );
        const result = await forwardToOriginalAPI(resource, req);

        // ✅ Set response headers if provided
        if (result.headers) {
          Object.entries(result.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }

        // Return the response
        return res.status(200).json(result.response || result);
      } catch (error) {
        console.error("Error calling MCP server:", error);
        return res.status(500).json({
          error: "MCP request failed",
          message: error.message,
        });
      }
    }

    // Handle API resources and other types
    if (resource.type === "api") {
      console.log("🌐 API resource request - checking payment...");

      const price = resource.pricing.defaultAmount;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const resourceUrl = `${baseUrl}/proxy/${resourceId}/${path}`;

      const paymentRequirements = [
        createExactPaymentRequirements(
          `$${price}`,
          "base-sepolia",
          resourceUrl,
          resource.creatorAddress,
          `Payment for ${resource.name}`
        ),
      ];

      const isValid = await verifyPayment(req, res, paymentRequirements);
      if (!isValid) return;

      console.log("✅ Payment verified, calling API...");

      try {
        const { forwardToOriginalAPI } = await import(
          "./services/proxyService.js"
        );
        const result = await forwardToOriginalAPI(resource, req);

        // Return the API result
        if (resource.type === "mcp_server") {
          // For MCP servers, preserve exact response format and status
          if (result.error) {
            // If it's a JSON-RPC error, return with 200 status (per JSON-RPC spec)
            return res.status(200).json(result);
          } else {
            return res.status(200).json(result);
          }
        } else {
          return res.json(result);
        }
      } catch (error) {
        console.error("Error calling API:", error);
        return res.status(500).json({
          error: "API call failed",
          message: error.message,
        });
      }
    }

    // Handle LLM (AI model) requests
    if (resource.type === "ai_model" && req.method === "POST") {
      console.log("🤖 AI model request - checking payment...");

      const { messages, temperature, max_tokens, ...otherOptions } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: "Invalid request format",
          expected:
            "{ messages: [...], temperature?: number, max_tokens?: number }",
        });
      }

      // Get fixed price for this model
      const fixedPrice = getModelPrice(resource.llmConfig.modelId);
      const tokenLimit = getTokenLimit(resource.llmConfig.modelId);

      console.log(
        `💰 Fixed pricing: $${fixedPrice} for up to ${tokenLimit} tokens`
      );

      // Create payment requirements
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const resourceUrl = `${baseUrl}/proxy/${resourceId}/${path}`;

      const paymentRequirements = [
        createExactPaymentRequirements(
          `$${fixedPrice}`,
          "base-sepolia",
          resourceUrl,
          resource.creatorAddress,
          `${resource.name} - up to ${tokenLimit} tokens`
        ),
      ];

      const isValid = await verifyPayment(req, res, paymentRequirements);
      if (!isValid) return;

      console.log("✅ Payment verified, generating LLM response...");

      try {
        // Call LLM with token limits using your internal service
        const llmResponse = await callLLM(
          resource.llmConfig.modelId,
          messages,
          {
            temperature: temperature || resource.llmConfig.defaultTemperature,
            maxTokens: max_tokens,
            ...otherOptions,
          }
        );

        console.log(
          `📊 Token usage: ${llmResponse.usage.totalTokens}/${tokenLimit} tokens used`
        );

        // Return OpenAI-compatible response
        res.json({
          id: crypto.randomUUID(),
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: resource.llmConfig.modelId,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: llmResponse.text,
              },
              finish_reason: llmResponse.usage.withinLimit ? "stop" : "length",
            },
          ],
          usage: llmResponse.usage,
          pricing: llmResponse.pricing,
        });

        // Log transaction
        // ... transaction logging code ...
      } catch (error) {
        console.error("Error calling LLM:", error);
        return res.status(500).json({
          error: "LLM generation failed",
          message: error.message,
        });
      }

      return;
    }

    // For any other resource types, apply default payment logic
    const price = resource.pricing.defaultAmount;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const resourceUrl = `${baseUrl}/proxy/${resourceId}/${path}`;

    const paymentRequirements = [
      createExactPaymentRequirements(
        `$${price}`,
        "base-sepolia",
        resourceUrl,
        resource.creatorAddress,
        `Payment for ${resource.name}`
      ),
    ];

    const isValid = await verifyPayment(req, res, paymentRequirements);
    if (!isValid) return;

    console.log("✅ Payment verified, forwarding request...");

    try {
      const { forwardToOriginalAPI } = await import(
        "./services/proxyService.js"
      );
      const result = await forwardToOriginalAPI(resource, req);
      if (resource.type === "mcp_server") {
        // For MCP servers, preserve exact response format and status
        if (result.error) {
          // If it's a JSON-RPC error, return with 200 status (per JSON-RPC spec)
          return res.status(200).json(result);
        } else {
          return res.status(200).json(result);
        }
      } else {
        return res.json(result);
      }
    } catch (error) {
      console.error("Error forwarding request:", error);
      res.status(500).json({
        error: "Request forwarding failed",
        message: error.message,
      });
    }
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Proxy request failed",
      message: error.message,
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 AI402 Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Payment facilitator: ${facilitatorUrl}`);
  console.log(`🌍 CORS: Allowing all origins`);
});

export default app;
