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
      txHash: settleResponse.transaction?.hash,
      blockNumber: settleResponse.transaction?.blockNumber,
      gasUsed: settleResponse.transaction?.gasUsed,
      fromAddress: settleResponse.payer || response.payer,
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

    console.log(`🔄 Proxy request: ${resourceId}, path: ${path}`);

    // Get resource configuration from database
    const resource = await Resource.findOne({ id: resourceId });
    if (!resource) {
      return res.status(404).json({
        error: "Resource not found",
        resourceId,
      });
    }

    console.log(`📡 Proxying to: ${resource.originalUrl}`);

    // For MCP servers, handle free tools/list requests
    if (resource.type === "mcp_server" && req.method === "POST") {
      const { method } = req.body;

      if (method === "tools/list") {
        console.log("🆓 Free tools/list request");
        const { forwardToOriginalAPI } = await import(
          "./services/proxyService.js"
        );
        const result = await forwardToOriginalAPI(resource, req);
        return res.json(result);
      }

      if (method === "tools/call") {
        console.log("💰 MCP tools/call request - checking payment...");

        // For MCP, we expect: { jsonrpc, method, params: { name, arguments } }
        const { params } = req.body;

        if (!params || !params.name) {
          return res.status(400).json({
            error: "Invalid MCP request format",
            expected:
              "{ jsonrpc: '2.0', method: 'tools/call', params: { name: string, arguments: object } }",
          });
        }

        const toolName = params.name;

        // Get pricing for this specific tool
        let toolPrice = resource.pricing.defaultAmount;
        if (
          resource.pricing.toolPricing &&
          resource.pricing.toolPricing.has(toolName)
        ) {
          toolPrice = resource.pricing.toolPricing.get(toolName);
        }

        console.log(`💰 Tool pricing: ${toolName} costs $${toolPrice}`);

        // Create payment requirements
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

        // Verify payment
        const isValid = await verifyPayment(req, res, paymentRequirements);
        if (!isValid) return;

        console.log("✅ Payment verified, calling MCP tool...");

        try {
          // Forward to original MCP server with authentication
          const { forwardToOriginalAPI } = await import(
            "./services/proxyService.js"
          );
          const result = await forwardToOriginalAPI(resource, req);

          // Return MCP result
          res.json(result);

          // Log transaction with settlement details
          const Transaction = (await import("./models/Transaction.js")).default;
          const transaction = new Transaction({
            resourceId: resource.id,
            resourceName: resource.name,
            fromAddress: req.settlementDetails?.fromAddress || "unknown",
            toAddress: resource.creatorAddress,
            amount: toolPrice,
            toolUsed: toolName,
            txHash: req.settlementDetails?.txHash,
            blockNumber: req.settlementDetails?.blockNumber,
            gasUsed: req.settlementDetails?.gasUsed,
            status: "completed",
            requestData: {
              method: req.method,
              path: path,
              body: { toolName, arguments: params.arguments },
            },
          });

          await transaction.save();
          console.log("💾 Saved transaction with details:", {
            txHash: req.settlementDetails?.txHash,
            blockNumber: req.settlementDetails?.blockNumber,
            fromAddress: req.settlementDetails?.fromAddress,
          });

          // Update resource stats
          await Resource.findOneAndUpdate(
            { id: resource.id },
            {
              $inc: {
                "stats.totalUses": 1,
                "stats.totalEarnings": toolPrice,
              },
              $set: {
                "stats.lastUsed": new Date(),
              },
            }
          );
        } catch (error) {
          console.error("Error calling MCP tool:", error);
          return res.status(500).json({
            error: "MCP tool call failed",
            message: error.message,
          });
        }

        return;
      }

      // Unknown MCP method
      return res.status(400).json({
        error: "Unsupported MCP method",
        method,
        supported: ["tools/list", "tools/call"],
      });
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

      // Get fixed price for this model (simple!)
      const fixedPrice = getModelPrice(resource.llmConfig.modelId);
      const tokenLimit = getTokenLimit(resource.llmConfig.modelId);

      console.log(
        `💰 Fixed pricing: $${fixedPrice} for up to ${tokenLimit} tokens`
      );

      // Create payment requirements with fixed price
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const resourceUrl = `${baseUrl}/proxy/${resourceId}/${path}`;

      const paymentRequirements = [
        createExactPaymentRequirements(
          `$${fixedPrice}`, // Fixed price - no calculation needed
          "base-sepolia",
          resourceUrl,
          resource.creatorAddress,
          `${resource.name} - up to ${tokenLimit} tokens`
        ),
      ];

      console.log(`🔍 Payment requirements:`, paymentRequirements[0]);

      // Verify payment for fixed amount
      const isValid = await verifyPayment(req, res, paymentRequirements);
      if (!isValid) return;

      console.log("✅ Payment verified, generating LLM response...");

      try {
        // Call LLM with token limits
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

        // Return response immediately (no settlement needed!)
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

        // Simple transaction logging with settlement details
        const Transaction = (await import("./models/Transaction.js")).default;
        const transaction = new Transaction({
          resourceId: resource.id,
          resourceName: resource.name,
          fromAddress: req.settlementDetails?.fromAddress || "unknown",
          toAddress: resource.creatorAddress,
          amount: fixedPrice,
          toolUsed: resource.llmConfig.modelId,
          txHash: req.settlementDetails?.txHash,
          blockNumber: req.settlementDetails?.blockNumber,
          gasUsed: req.settlementDetails?.gasUsed,
          status: "completed",
          requestData: {
            method: req.method,
            path: path,
            body: {
              messages: `${messages.length} messages`,
              tokensUsed: llmResponse.usage.totalTokens,
            },
          },
        });

        await transaction.save();
        console.log("💾 Saved transaction with details:", {
          txHash: req.settlementDetails?.txHash,
          blockNumber: req.settlementDetails?.blockNumber,
          fromAddress: req.settlementDetails?.fromAddress,
        });

        // Update resource stats
        await Resource.findOneAndUpdate(
          { id: resource.id },
          {
            $inc: {
              "stats.totalUses": 1,
              "stats.totalEarnings": fixedPrice,
              "stats.totalTokensUsed": llmResponse.usage.totalTokens,
            },
            $set: {
              "stats.lastUsed": new Date(),
            },
          }
        );
      } catch (error) {
        console.error("Error calling LLM:", error);
        return res.status(500).json({
          error: "LLM generation failed",
          message: error.message,
        });
      }

      return;
    }

    // For other resource types, apply similar payment logic
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

    // Process other resource types...
    console.log("✅ Payment verified for other resource type");
    // Add your logic here for other resource types
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
