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
 * Verifies a payment and handles the response - IMPROVED ERROR HANDLING
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
    return true;
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    res.status(402).json({
      x402Version,
      error: `Payment verification failed: ${error.message || error}`,
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
        console.log("💰 Paid tools/call request - checking payment...");

        // Determine the price for this specific tool
        let price = resource.pricing.defaultAmount;
        const toolName = req.body.params?.name;

        if (resource.pricing.model === "per_tool" && toolName) {
          const toolPrice = resource.pricing.toolPricing.get(toolName);
          if (toolPrice !== undefined) {
            price = toolPrice;
            console.log(`💰 Per-tool pricing: ${toolName} = $${price}`);
          } else {
            console.log(`💰 Using default price for ${toolName}: $${price}`);
          }
        } else {
          console.log(`💰 Per-call pricing: $${price}`);
        }

        // FIXED: Create payment requirements with correct resource URL
        // Use the original URL without duplication
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const resourceUrl = `${baseUrl}/proxy/${resourceId}/${path}`;
        console.log(`🔍 Generated resource URL: ${resourceUrl}`);

        const paymentRequirements = [
          createExactPaymentRequirements(
            `$${price}`, // Dynamic price from database
            "base-sepolia",
            resourceUrl, // FIXED: No more duplication
            resource.creatorAddress, // Dynamic payTo from database
            `Payment for ${resource.name} - ${toolName || "tool call"}`
          ),
        ];

        console.log(`🔍 Payment requirements created:`, paymentRequirements[0]);

        // Verify payment
        const isValid = await verifyPayment(req, res, paymentRequirements);
        if (!isValid) return;

        // If payment is valid, process the request
        console.log("✅ Payment verified, executing tool call");

        try {
          // Forward request to original API
          const { forwardToOriginalAPI } = await import(
            "./services/proxyService.js"
          );
          const result = await forwardToOriginalAPI(resource, req);

          // Process payment settlement
          const settleResponse = await settle(
            exact.evm.decodePayment(req.header("X-PAYMENT")),
            paymentRequirements[0]
          );
          const responseHeader = settleResponseHeader(settleResponse);
          res.setHeader("X-PAYMENT-RESPONSE", responseHeader);

          // Log successful transaction
          const Transaction = (await import("./models/Transaction.js")).default;
          const transaction = new Transaction({
            resourceId: resource.id,
            resourceName: resource.name,
            fromAddress: settleResponse.payer || "unknown",
            toAddress: resource.creatorAddress,
            amount: price,
            toolUsed: toolName || "tool_call",
            requestData: {
              method: req.method,
              path: path,
              body: req.body,
            },
          });

          await transaction.save();

          // Update resource stats
          await Resource.findOneAndUpdate(
            { id: resource.id },
            {
              $inc: {
                "stats.totalUses": 1,
                "stats.totalEarnings": price,
              },
              $set: {
                "stats.lastUsed": new Date(),
              },
            }
          );

          // Return the result
          return res.json(result);
        } catch (error) {
          console.error("Error processing paid request:", error);
          return res.status(500).json({
            error: "Failed to process request",
            message: error.message,
          });
        }
      }

      // Unknown MCP method
      return res.status(400).json({
        error: "Unsupported MCP method",
        method,
        supported: ["tools/list", "tools/call"],
      });
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
