import express from "express";
import Resource from "../models/Resource.js";
import Transaction from "../models/Transaction.js";
import { forwardToOriginalAPI } from "../services/proxyService.js";

const router = express.Router();

// Handle all proxy requests
router.all("/:resourceId/*?", async (req, res) => {
  try {
    const { resourceId } = req.params;
    const path = req.params[0] || "";

    console.log(`🔄 Proxy request: ${resourceId}, path: ${path}`);

    // Get resource configuration
    const resource = await Resource.findOne({ id: resourceId });
    if (!resource) {
      return res.status(404).json({
        error: "Resource not found",
        resourceId,
      });
    }

    console.log(`📡 Proxying to: ${resource.originalUrl}`);

    // For MCP servers, check if it's a free tools/list request
    if (resource.type === "mcp_server" && req.method === "POST") {
      const { method } = req.body;

      if (method === "tools/list") {
        console.log("🆓 Free tools/list request");
        const result = await forwardToOriginalAPI(resource, req);
        return res.json(result);
      }

      if (method === "tools/call") {
        console.log("💰 Paid tools/call request - payment verified");
        // Payment already verified by middleware
      }
    }

    // For all other requests, payment was already verified by middleware
    console.log("✅ Payment verified, executing request");

    const result = await forwardToOriginalAPI(resource, req);

    // Log successful transaction
    const transaction = new Transaction({
      resourceId: resource.id,
      resourceName: resource.name,
      fromAddress: req.headers["x-payment-from"] || "unknown",
      toAddress: resource.creatorAddress,
      amount: resource.pricing.defaultAmount,
      toolUsed: req.body?.method || "api_call",
      requestData: {
        method: req.method,
        path: path,
        body: req.body,
      },
    });

    await transaction.save();

    // Update resource stats
    await Resource.findOneAndUpdate(
      { id: resourceId },
      {
        $inc: {
          "stats.totalUses": 1,
          "stats.totalEarnings": resource.pricing.defaultAmount,
        },
        $set: {
          "stats.lastUsed": new Date(),
        },
      }
    );

    // Add payment confirmation header
    res.set("X-PAYMENT-CONFIRMED", "true");
    res.json(result);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Proxy request failed",
      message: error.message,
    });
  }
});

export default router;
