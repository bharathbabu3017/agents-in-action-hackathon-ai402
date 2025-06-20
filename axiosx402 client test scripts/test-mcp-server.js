import axios from "axios";
import { config } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";

config();

const mcpUrl =
  "https://www.ai402proxy.xyz/proxy/7b67b5cb-b31d-498d-8d73-7a61b1a9c223/mcp";
const privateKey = process.env.PRIVATE_KEY;

async function testMCPPayment() {
  console.log("🚀 Testing MCP Server:", mcpUrl);

  // Step 1: List tools (should be free)
  console.log("\n📋 Listing available tools (free)...");
  try {
    const response = await axios.post(
      mcpUrl,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      },
      {
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Available tools:");
    if (response.data.result?.tools) {
      response.data.result.tools.slice(0, 5).forEach((tool, i) => {
        console.log(
          `  ${i + 1}. ${tool.name}: ${tool.description || "No description"}`
        );
      });
      if (response.data.result.tools.length > 5) {
        console.log(
          `  ... and ${response.data.result.tools.length - 5} more tools`
        );
      }
    }
  } catch (error) {
    console.log(
      "❌ Error listing tools:",
      error.response?.data || error.message
    );
    return;
  }

  // Step 2: Try tool call without payment (should get 402)
  console.log("\n📞 Calling tool without payment...");
  try {
    const response = await axios.post(
      mcpUrl,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "search",
          arguments: {
            query: "how to create a token on Solana",
          },
        },
      },
      {
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
      }
    );
    console.log("❌ Unexpected: Got response without payment:", response.data);
  } catch (error) {
    if (error.response?.status === 402) {
      console.log("✅ Got 402 Payment Required");
      console.log("💰 Payment details:");
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(
        "❌ Unexpected error:",
        error.response?.status,
        error.message
      );
      return;
    }
  }

  // Step 3: Try with payment
  if (!privateKey) {
    console.log("\n⚠️  No PRIVATE_KEY in .env - cannot test payment");
    return;
  }

  console.log("\n💳 Making payment for tool call...");
  try {
    const account = privateKeyToAccount(privateKey);
    console.log("Using wallet:", account.address);

    const api = withPaymentInterceptor(axios.create(), account);
    const response = await api.post(
      mcpUrl,
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "search",
          arguments: {
            query: "how to create a token on Solana",
          },
        },
      },
      {
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Payment successful!");
    console.log("📄 Tool response:");
    console.log(JSON.stringify(response.data, null, 2));

    // Show payment details if available
    if (response.headers["x-payment-response"]) {
      console.log(
        "💳 Payment confirmation:",
        response.headers["x-payment-response"]
      );
    }
  } catch (error) {
    console.log("❌ Payment failed:", error.response?.status);
    console.log("Error:", error.response?.data || error.message);
  }
}

testMCPPayment().catch(console.error);
