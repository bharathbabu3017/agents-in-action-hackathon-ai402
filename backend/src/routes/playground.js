import express from "express";
import { exact } from "x402/schemes";
import { settleResponseHeader } from "x402/types";
import { useFacilitator } from "x402/verify";
import { processPriceToAtomicAmount } from "x402/shared";
import Resource from "../models/Resource.js";
import Transaction from "../models/Transaction.js";
import {
  analyzeChatMessage,
  getMCPTools,
  executeToolCall,
  generateFinalResponse,
  extractTransactionDetails,
} from "../services/playgroundChatService.js";

// Placeholder for playground routes
const router = express.Router();

// Configure x402 for playground
const facilitatorUrl = process.env.FACILITATOR_URL;
const { verify, settle } = useFacilitator({ url: facilitatorUrl });
const x402Version = 1;

/**
 * Create payment requirements for tool calls
 */
function createToolPaymentRequirements(price, resource, toolName, description) {
  const atomicAmountForAsset = processPriceToAtomicAmount(
    price,
    "base-sepolia"
  );
  if ("error" in atomicAmountForAsset) {
    throw new Error(atomicAmountForAsset.error);
  }
  const { maxAmountRequired, asset } = atomicAmountForAsset;

  return {
    scheme: "exact",
    network: "base-sepolia",
    maxAmountRequired,
    resource: `${
      process.env.PROXY_BASE_URL || "http://localhost:3001"
    }/api/playground/chat`,
    description: `${description} - Tool: ${toolName}`,
    mimeType: "",
    payTo: resource.creatorAddress,
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
 * Playground Chat Endpoint
 * Combines LLM + MCP with payment only for tool usage
 */
router.post("/chat", async (req, res) => {
  try {
    const {
      llmModelId, // e.g., "apac.amazon.nova-lite-v1:0"
      mcpResourceId, // Resource ID for MCP server
      messages, // Chat messages array
      confirmedToolCall, // Tool call user confirmed for payment
      sessionId, // Optional session tracking
    } = req.body;

    console.log(`🎮 Playground chat: LLM=${llmModelId}, MCP=${mcpResourceId}`);

    // Validate input
    if (
      !llmModelId ||
      !mcpResourceId ||
      !messages ||
      !Array.isArray(messages)
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["llmModelId", "mcpResourceId", "messages"],
      });
    }

    // Get MCP resource
    const mcpResource = await Resource.findOne({ id: mcpResourceId });
    if (!mcpResource || mcpResource.type !== "mcp_server") {
      return res.status(404).json({
        error: "MCP resource not found",
        mcpResourceId,
      });
    }

    // If user is confirming a tool call, handle payment and execution
    if (confirmedToolCall) {
      console.log("💰 Processing confirmed tool call with payment...");

      const {
        name: toolName,
        parameters,
        reasoning,
        pricing,
        originalBedrockResponse,
      } = confirmedToolCall;

      // Verify payment for tool call
      const payment = req.header("X-PAYMENT");
      if (!payment) {
        return res.status(402).json({
          x402Version,
          error: "X-PAYMENT header is required for tool execution",
          accepts: [
            createToolPaymentRequirements(
              `$${pricing.amount}`,
              mcpResource,
              toolName,
              mcpResource.name
            ),
          ],
        });
      }

      let decodedPayment;
      try {
        decodedPayment = exact.evm.decodePayment(payment);
        decodedPayment.x402Version = x402Version;
      } catch (error) {
        return res.status(402).json({
          x402Version,
          error: `Invalid payment: ${error.message}`,
          accepts: [
            createToolPaymentRequirements(
              `$${pricing.amount}`,
              mcpResource,
              toolName,
              mcpResource.name
            ),
          ],
        });
      }

      // Create payment requirements for this tool
      const paymentRequirements = createToolPaymentRequirements(
        `$${pricing.amount}`,
        mcpResource,
        toolName,
        mcpResource.name
      );

      console.log("🔍 Payment requirements:", paymentRequirements);

      // Verify payment
      try {
        const verifyResponse = await verify(
          decodedPayment,
          paymentRequirements
        );
        if (!verifyResponse.isValid) {
          return res.status(402).json({
            x402Version,
            error:
              verifyResponse.invalidReason || "Payment verification failed",
            accepts: [paymentRequirements],
          });
        }
        console.log("✅ Payment verification successful");
      } catch (error) {
        console.error("Payment verification error:", error);
        return res.status(402).json({
          x402Version,
          error: `Payment verification failed: ${error.message}`,
          accepts: [paymentRequirements],
        });
      }

      console.log("✅ Payment verified, executing tool...");

      try {
        // Execute the tool call
        const toolResult = await executeToolCall(
          mcpResource,
          toolName,
          parameters
        );

        // Get MCP tools again for toolConfig
        const mcpTools = await getMCPTools(mcpResource);

        // Generate final response with tool data
        const finalResponse = await generateFinalResponse(
          llmModelId,
          messages,
          originalBedrockResponse,
          toolName,
          toolResult
        );

        // Settle payment
        try {
          const settleResponse = await settle(
            decodedPayment,
            paymentRequirements
          );
          const responseHeader = settleResponseHeader(settleResponse);
          res.setHeader("X-PAYMENT-RESPONSE", responseHeader);

          // Extract blockchain transaction details (FIXED)
          const txDetails = extractTransactionDetails(settleResponse);

          // Create explorer URL
          const getExplorerUrl = (txHash, network) => {
            const explorers = {
              "base-sepolia": `https://sepolia.basescan.org/tx/${txHash}`,
              base: `https://basescan.org/tx/${txHash}`,
              ethereum: `https://etherscan.io/tx/${txHash}`,
              sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
            };
            return (
              explorers[network] || `https://sepolia.basescan.org/tx/${txHash}`
            );
          };

          const explorerUrl = txDetails.txHash
            ? getExplorerUrl(txDetails.txHash, txDetails.network)
            : null;

          // Log transaction with proper blockchain details
          const transaction = new Transaction({
            resourceId: mcpResource.id,
            resourceName: mcpResource.name,
            fromAddress: txDetails.payer || "unknown",
            toAddress: mcpResource.creatorAddress,
            amount: pricing.amount,
            toolUsed: toolName,
            txHash: txDetails.txHash, // ✅ Proper field
            blockNumber: txDetails.blockNumber, // ✅ Proper field
            gasUsed: txDetails.gasUsed, // ✅ Proper field
            status: "completed",
            requestData: {
              sessionId,
              toolParameters: parameters,
              llmModel: llmModelId,
            },
          });

          await transaction.save();

          console.log("💾 Saved transaction with blockchain details:", {
            txHash: txDetails.txHash,
            blockNumber: txDetails.blockNumber,
            gasUsed: txDetails.gasUsed,
            payer: txDetails.payer,
          });

          // Update resource stats
          await Resource.findOneAndUpdate(
            { id: mcpResource.id },
            {
              $inc: {
                "stats.totalUses": 1,
                "stats.totalEarnings": pricing.amount,
              },
              $set: { "stats.lastUsed": new Date() },
            }
          );

          console.log(`💳 Payment settled successfully: $${pricing.amount}`);
          if (txDetails.txHash) {
            console.log(`🔗 Blockchain TX: ${txDetails.txHash}`);
            console.log(`🌐 Explorer: ${explorerUrl}`);
          }

          // Return successful response with blockchain details
          return res.json({
            type: "tool_executed",
            response: finalResponse.response,
            toolUsed: toolName,
            toolResult: toolResult,
            transaction: {
              id: transaction._id,
              amount: pricing.amount,
              payer: txDetails.payer,
              blockchainTxHash: txDetails.txHash,
              explorerUrl: explorerUrl,
              network: txDetails.network,
            },
            sessionId,
          });
        } catch (settlementError) {
          console.error("❌ Payment settlement failed:", settlementError);

          // Still return the tool result even if settlement fails
          return res.json({
            type: "tool_executed",
            response: finalResponse.response,
            toolUsed: toolName,
            toolResult: toolResult,
            transaction: {
              id: "settlement_failed",
              amount: pricing.amount,
              payer: "unknown",
              error: "Settlement failed",
            },
            sessionId,
            warning: "Tool executed successfully but payment settlement failed",
          });
        }
      } catch (error) {
        console.error("Tool execution error:", error);
        return res.status(500).json({
          error: "Tool execution failed",
          message: error.message,
        });
      }
    }

    // Normal chat flow - analyze if tools are needed
    console.log("🤔 Analyzing chat message for tool requirements...");

    // Get available MCP tools
    const mcpTools = await getMCPTools(mcpResource);
    console.log(
      `🛠️ Available tools: ${mcpTools.map((t) => t.name).join(", ")}`
    );

    // Analyze message with LLM (free)
    const analysis = await analyzeChatMessage(
      llmModelId,
      messages,
      mcpTools,
      mcpResource.name
    );

    if (!analysis.needsPayment) {
      // No tool needed - return free LLM response
      console.log("✅ No tools needed, returning free LLM response");

      return res.json({
        type: "llm_response",
        response: analysis.response,
        tokensUsed: analysis.tokensUsed,
        toolsAvailable: mcpTools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
        sessionId,
      });
    }

    // Tool is needed - return 402 with payment requirements
    console.log(`🔧 Tool required: ${analysis.toolCall.name}`);

    // Calculate tool pricing
    const toolName = analysis.toolCall.name;
    const pricing =
      mcpResource.pricing.model === "per_tool" &&
      mcpResource.pricing.toolPricing.has(toolName)
        ? mcpResource.pricing.toolPricing.get(toolName)
        : mcpResource.pricing.defaultAmount;

    const paymentRequirements = createToolPaymentRequirements(
      `$${pricing}`,
      mcpResource,
      toolName,
      mcpResource.name
    );

    return res.status(402).json({
      x402Version,
      error: "Payment required for tool usage",
      type: "tool_payment_required",
      toolCall: {
        name: toolName,
        parameters: analysis.toolCall.parameters,
        reasoning:
          analysis.reasoning ||
          `Need to use ${toolName} tool to answer your question`,
        llmResponse: analysis.response,
        originalBedrockResponse: analysis.originalBedrockResponse,
        pricing: {
          amount: pricing,
          description: `${mcpResource.name} - ${toolName} tool`,
        },
      },
      accepts: [paymentRequirements],
      instructions:
        "Confirm this tool usage to get your answer. You will only pay for the tool call, not the LLM usage.",
      sessionId,
    });
  } catch (error) {
    console.error("Playground chat error:", error);
    res.status(500).json({
      error: "Chat request failed",
      message: error.message,
    });
  }
});

export default router;
