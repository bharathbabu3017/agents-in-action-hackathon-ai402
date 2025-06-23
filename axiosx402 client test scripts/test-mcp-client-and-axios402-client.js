import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { withPaymentInterceptor } from "x402-axios";
import { privateKeyToAccount } from "viem/accounts";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PROXY_URL =
  "http://localhost:3001/proxy/54021845-c954-460d-a392-99feedbd0b28/mcp";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function testHybridMCPPayment() {
  console.log("🧪 Hybrid MCP Payment Test (MCP SDK + x402-axios)");
  console.log("═".repeat(65));

  if (!PRIVATE_KEY) {
    console.log("⚠️ No PRIVATE_KEY in .env - cannot test payments");
    return;
  }

  let client = null;
  let sessionHeaders = {};

  try {
    // Step 1: Initialize MCP session using SDK
    console.log("\n🤝 Step 1: Initialize MCP session using MCP Client SDK");

    client = new Client(
      {
        name: "hybrid-payment-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Try StreamableHTTP first (like in the debug script)
    console.log("🔄 Connecting via StreamableHTTP transport...");
    let transport;
    try {
      transport = new StreamableHTTPClientTransport(new URL(PROXY_URL), {
        requestInit: {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
        },
      });

      await client.connect(transport);
      console.log("✅ Connected via StreamableHTTP");
    } catch (httpError) {
      console.log("⚠️ StreamableHTTP failed, trying SSE...", httpError.message);

      // Fallback to SSE
      transport = new SSEClientTransport(new URL(PROXY_URL), {
        requestInit: {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
        },
      });

      await client.connect(transport);
      console.log("✅ Connected via SSE transport");
    }

    // Extract session headers for later use with x402
    // Check if transport has session info we can extract
    if (transport && transport._sessionId) {
      sessionHeaders["mcp-session-id"] = transport._sessionId;
      console.log("🔑 Extracted session ID:", transport._sessionId);
    }

    // Step 2: List tools using MCP SDK (free operation)
    console.log("\n🛠️ Step 2: List tools using MCP Client SDK");

    const toolsResult = await client.listTools();
    console.log("✅ Tools listed successfully via MCP SDK");

    if (toolsResult.tools && toolsResult.tools.length > 0) {
      console.log(
        "🎯 Available tools:",
        toolsResult.tools.map((t) => t.name)
      );

      // Step 3: Test capabilities (free operation)
      console.log("\n⚙️ Step 3: Test capabilities using MCP SDK");
      try {
        const capabilities = await client.getServerCapabilities();
        console.log("✅ Server capabilities retrieved via SDK");
        console.log("🔧 Server supports:", Object.keys(capabilities));
      } catch (capError) {
        console.log("⚠️ Capabilities call failed:", capError.message);
      }

      // Step 4: Try tool call without payment (should get 402)
      console.log(
        "\n💰 Step 4: Attempt tool call via SDK (should fail with payment required)"
      );

      const toolName = toolsResult.tools[0].name;
      console.log(`🔧 Testing tool: ${toolName}`);

      try {
        await client.callTool({
          name: toolName,
          arguments: {
            text: "test without payment",
            operation: "encode",
          },
        });
        console.log(
          "❌ Unexpected: Tool call succeeded without payment via SDK"
        );
      } catch (error) {
        console.log("✅ Expected: Tool call failed via SDK -", error.message);
        console.log("💡 This confirms payment is required for tool calls");
      }

      // Step 5: Switch to x402-axios for paid tool call
      console.log("\n💳 Step 5: Switch to x402-axios for PAID tool call");

      const account = privateKeyToAccount(PRIVATE_KEY);
      console.log("🔑 Using wallet for payment:", account.address);

      // Create axios instance with payment interceptor
      const paymentApi = withPaymentInterceptor(axios.create(), account);

      // Prepare the MCP tool call request with session headers
      const toolCallRequest = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: {
            text: "hello from hybrid payment test",
            operation: "encode",
          },
        },
      };

      // Include any session headers we extracted from MCP SDK
      const requestHeaders = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...sessionHeaders, // Include any MCP session info
      };

      console.log("📤 Making paid request via x402-axios...");
      console.log("🔗 Using headers:", Object.keys(requestHeaders));

      const response = await paymentApi.post(PROXY_URL, toolCallRequest, {
        headers: requestHeaders,
      });

      console.log("✅ Payment successful via x402-axios!");
      console.log("🔧 Tool execution result:");

      if (response.data.result?.content) {
        const result = response.data.result.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");
        console.log("📄 Encoded result:", result);
      } else {
        console.log("📄 Raw response:", JSON.stringify(response.data, null, 2));
      }

      // Show payment confirmation
      if (response.headers["x-payment-response"]) {
        const paymentResponse = response.headers["x-payment-response"];
        console.log(
          "💳 Payment confirmed:",
          paymentResponse.substring(0, 50) + "..."
        );

        try {
          const decoded = JSON.parse(atob(paymentResponse));
          if (decoded.transaction) {
            console.log("🔗 Blockchain TX:", decoded.transaction);
          }
        } catch (e) {
          // ignore decode errors
        }
      }

      // Step 6: Verify we can still use MCP SDK for free operations
      console.log(
        "\n🔄 Step 6: Verify MCP SDK still works for free operations"
      );
      try {
        const toolsAgain = await client.listTools();
        console.log(
          "✅ MCP SDK still working after payment:",
          toolsAgain.tools.length,
          "tools"
        );
      } catch (error) {
        console.log(
          "⚠️ MCP SDK connection may have been affected:",
          error.message
        );
      }
    } else {
      console.log("❌ No tools available to test");
    }
  } catch (error) {
    console.error("❌ Hybrid test failed:", error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  } finally {
    // Clean up MCP client
    if (client) {
      try {
        await client.close();
        console.log("\n🔌 MCP client connection closed");
      } catch (closeError) {
        console.log("⚠️ Error closing MCP client:", closeError.message);
      }
    }
  }

  console.log("\n" + "═".repeat(65));
  console.log("🏁 Hybrid MCP payment test complete!");
  console.log("");
  console.log("💡 Summary:");
  console.log("  ✅ Free operations: MCP Client SDK");
  console.log("  💰 Paid operations: x402-axios");
  console.log("  🔗 Session continuity: Preserved via headers");
}

testHybridMCPPayment().catch(console.error);
