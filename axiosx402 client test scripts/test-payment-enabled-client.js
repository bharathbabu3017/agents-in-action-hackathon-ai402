import { PaymentEnabledMCPClient } from "./PaymentEnabledMCPClient.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

const PROXY_URL =
  "http://localhost:3001/proxy/54021845-c954-460d-a392-99feedbd0b28/mcp";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function testSimpleEncode() {
  console.log("🧪 Simple MCP Tool Call with Auto-Payment");
  console.log("═".repeat(45));

  const account = privateKeyToAccount(PRIVATE_KEY);
  const client = new PaymentEnabledMCPClient(
    { name: "simple-test", version: "1.0.0" },
    { capabilities: { tools: {} } },
    account // Just pass the account directly
  );

  try {
    // Connect normally
    const transport = new StreamableHTTPClientTransport(new URL(PROXY_URL), {
      requestInit: {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      },
    });

    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // Call tool - automatically pays if needed
    console.log("\n🔧 Calling base64-converter...");
    const result = await client.payAndCallTool({
      name: "base64-converter",
      arguments: {
        text: "hello world",
        operation: "encode",
      },
    });

    const encoded = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("");

    console.log("✅ Result:", encoded);
  } catch (error) {
    console.error("❌ Failed:", error.message);
  } finally {
    await client.close();
  }
}

testSimpleEncode().catch(console.error);
