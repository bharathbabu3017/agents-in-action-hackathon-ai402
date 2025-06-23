import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { withPaymentInterceptor } from "x402-axios";
import axios from "axios";

export class PaymentEnabledMCPClient extends Client {
  constructor(clientInfo, options, paymentAccount) {
    super(clientInfo, options);
    this._paymentAccount = paymentAccount;
  }

  /**
   * Enhanced callTool that automatically handles payments
   * Tries normal MCP call first, then falls back to payment if 402 received
   */
  async payAndCallTool(params, options = {}) {
    try {
      // First try the normal MCP SDK call (might be free)
      console.log(`🔧 Attempting tool call: ${params.name}`);
      const result = await this.callTool(params, undefined, options);
      console.log(`✅ Tool call succeeded without payment`);
      return result;
    } catch (error) {
      // Check if this is a payment required error
      if (this._isPaymentRequiredError(error)) {
        console.log(`💰 Payment required for tool: ${params.name}`);
        return await this._handlePaidToolCall(params);
      }

      // Re-throw non-payment errors
      throw error;
    }
  }

  _isPaymentRequiredError(error) {
    return (
      error.message?.includes("402") ||
      error.message?.includes("Payment Required") ||
      error.message?.includes("payment")
    );
  }

  async _handlePaidToolCall(params) {
    if (!this._paymentAccount) {
      throw new Error("Payment account not configured");
    }

    console.log(`💳 Processing payment for tool: ${params.name}`);

    // Get the base URL from current transport
    const baseUrl = this._getTransportUrl();
    if (!baseUrl) {
      throw new Error("Cannot determine transport URL for payment");
    }

    // Create payment-enabled axios client
    const paymentApi = withPaymentInterceptor(
      axios.create(),
      this._paymentAccount
    );

    // Extract session headers
    const sessionHeaders = this._extractSessionHeaders();

    // Prepare MCP JSON-RPC request
    const toolCallRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: params,
    };

    try {
      // Just call the same URL that MCP SDK was using, x402-axios handles the 402!
      const response = await paymentApi.post(baseUrl, toolCallRequest, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...sessionHeaders,
        },
      });

      console.log(`✅ Paid tool call successful: ${params.name}`);

      if (response.data.error) {
        throw new Error(`Tool call failed: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (paymentError) {
      console.error(`❌ Paid tool call failed: ${paymentError.message}`);
      throw new Error(`Payment failed: ${paymentError.message}`);
    }
  }

  _getTransportUrl() {
    // Extract URL from the current transport
    if (this.transport && this.transport._url) {
      return this.transport._url.toString();
    }
    return null;
  }

  _extractSessionHeaders() {
    const headers = {};
    if (this.transport?.sessionId) {
      headers["mcp-session-id"] = this.transport.sessionId;
    }
    return headers;
  }

  /**
   * Enhanced listTools that also caches tool pricing info if available
   */
  async listToolsWithPricing(params, options) {
    const result = await this.listTools(params, options);

    // Cache tool pricing info if available in tool descriptions or metadata
    this._cacheToolPricing(result.tools);

    return result;
  }

  /**
   * Cache tool pricing information for display purposes
   */
  _cacheToolPricing(tools) {
    this._toolPricing = new Map();

    for (const tool of tools) {
      // Look for pricing info in tool description or metadata
      if (tool.description?.includes("$")) {
        const priceMatch = tool.description.match(/\$(\d+(?:\.\d+)?)/);
        if (priceMatch) {
          this._toolPricing.set(tool.name, parseFloat(priceMatch[1]));
        }
      }
    }
  }

  /**
   * Get estimated price for a tool (if available)
   */
  getToolPrice(toolName) {
    return this._toolPricing?.get(toolName) || null;
  }

  /**
   * Get payment configuration status
   */
  getPaymentStatus() {
    return {
      configured: !!this._paymentAccount,
      hasWallet: !!this._paymentAccount,
    };
  }
}
