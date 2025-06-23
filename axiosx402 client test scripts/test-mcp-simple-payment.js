import { withPaymentInterceptor } from "x402-axios";
import { privateKeyToAccount } from "viem/accounts";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PROXY_URL =
  "http://localhost:3001/proxy/5a78153a-8116-46bf-9d16-da34a0755feb/mcp";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function testWithSessionManagement() {
  console.log("🧪 MCP Payment Test with Session Management");
  console.log("═".repeat(55));

  if (!PRIVATE_KEY) {
    console.log("⚠️ No PRIVATE_KEY in .env - cannot test payments");
    return;
  }

  let sessionId = null;

  // Step 1: Initialize session
  console.log("\n🤝 Step 1: Initialize MCP session");
  try {
    const initResponse = await axios.post(
      PROXY_URL,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      }
    );

    // Extract session ID from response headers
    sessionId = initResponse.headers["mcp-session-id"];
    console.log("✅ Session initialized");
    console.log("🔑 Session ID:", sessionId);

    if (!sessionId) {
      console.log("❌ No session ID received from initialization");
      return;
    }
  } catch (error) {
    console.log(
      "❌ Initialization failed:",
      error.response?.status,
      error.message
    );
    return;
  }

  // Step 2: Send initialized notification
  console.log("\n📨 Step 2: Send initialized notification");
  try {
    await axios.post(
      PROXY_URL,
      {
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {},
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId, // ✅ Include session ID
        },
      }
    );
    console.log("✅ Initialized notification sent");
  } catch (error) {
    console.log(
      "⚠️ Initialized notification failed (might be OK):",
      error.response?.status
    );
  }

  // Step 3: List tools with session
  console.log("\n🛠️ Step 3: List tools with session");
  try {
    const toolsResponse = await axios.post(
      PROXY_URL,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId, // ✅ Include session ID
        },
      }
    );

    console.log("✅ Tools listed successfully");

    if (toolsResponse.data.result?.tools) {
      console.log(
        "🎯 Available tools:",
        toolsResponse.data.result.tools.map((t) => t.name)
      );
    }
  } catch (error) {
    console.log(
      "❌ Tools listing failed:",
      error.response?.status,
      error.response?.data
    );
  }

  // Step 4: Tool call without payment (should get 402)
  console.log("\n💰 Step 4: Tool call WITHOUT payment");
  try {
    const response = await axios.post(
      PROXY_URL,
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "base64-converter",
          arguments: {
            text: "hello world",
            operation: "encode",
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId, // ✅ Include session ID
        },
      }
    );
    console.log("❌ Unexpected: Got response without payment");
  } catch (error) {
    if (error.response?.status === 402) {
      console.log("✅ Got 402 Payment Required");
      console.log(
        "💰 Payment amount:",
        error.response.data.accepts[0]?.maxAmountRequired
      );
    } else {
      console.log(
        "❌ Unexpected error:",
        error.response?.status,
        error.response?.data
      );
    }
  }

  // Step 5: Tool call WITH payment and session
  console.log("\n💳 Step 5: Tool call WITH payment and session");
  try {
    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log("🔑 Using wallet:", account.address);

    const api = withPaymentInterceptor(axios.create(), account);

    const response = await api.post(
      PROXY_URL,
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "base64-converter",
          arguments: {
            text: "hello world",
            operation: "encode",
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId, // ✅ Include session ID
        },
      }
    );

    console.log("✅ Payment successful!");
    console.log("🔧 Tool result:");

    if (response.data.result?.content) {
      const result = response.data.result.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      console.log(result);
    } else {
      console.log(JSON.stringify(response.data, null, 2));
    }

    // Show payment details
    if (response.headers["x-payment-response"]) {
      console.log(
        "💳 Payment confirmed:",
        response.headers["x-payment-response"]
      );
    }
  } catch (error) {
    console.log("❌ Payment failed:", error.response?.status);
    console.log("Error:", error.response?.data || error.message);
  }

  console.log("\n" + "═".repeat(55));
  console.log("🏁 Session-managed payment test complete!");
}

testWithSessionManagement().catch(console.error);
