import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import axios from "axios";

const MCP_SERVER_URL = "http://localhost:9000/mcp";
const BEARER_TOKEN = "sk12345";

async function debugMCPAuth() {
  console.log("🔍 Debug: Testing FIXED MCP Client SDK Auth Headers");
  console.log("═".repeat(60));

  // Test 1: MCP Client SDK with CORRECT header format
  console.log("\n🤖 Test 1: MCP Client SDK with FIXED auth headers");
  let client;
  try {
    client = new Client(
      {
        name: "auth-debug-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          roots: {},
          sampling: {},
          tools: {},
        },
      }
    );

    const authHeaders = {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      Accept: "application/json, text/event-stream",
    };

    console.log("🔗 Auth headers:", authHeaders);

    // ✅ Try StreamableHTTP with CORRECT format
    console.log("\n🔄 Trying StreamableHTTP with FIXED auth...");
    try {
      const transport = new StreamableHTTPClientTransport(
        new URL(MCP_SERVER_URL),
        {
          requestInit: {
            headers: authHeaders, // ✅ CORRECT: Headers inside requestInit!
          },
        }
      );

      console.log("🤝 Connecting with corrected header format...");
      await client.connect(transport);
      console.log("✅ StreamableHTTP connected with auth!");

      console.log("🛠️ Listing tools...");
      const tools = await client.listTools();
      console.log("✅ Tools via StreamableHTTP:", tools.tools.length);
      console.log(
        "🎯 Tool names:",
        tools.tools.map((t) => t.name)
      );

      await client.close();
      client = null;
    } catch (httpError) {
      console.log("❌ StreamableHTTP failed:", httpError.message);

      // ✅ Try SSE fallback with CORRECT format
      console.log("\n🔄 Trying SSE with FIXED auth...");
      try {
        if (client) await client.close();
        client = new Client(
          {
            name: "auth-debug-client-sse",
            version: "1.0.0",
          },
          {
            capabilities: {
              roots: {},
              sampling: {},
              tools: {},
            },
          }
        );

        const sseTransport = new SSEClientTransport(new URL(MCP_SERVER_URL), {
          requestInit: {
            headers: authHeaders, // ✅ CORRECT: Headers inside requestInit!
          },
        });

        console.log("🤝 Connecting via SSE with corrected format...");
        await client.connect(sseTransport);
        console.log("✅ SSE connected with auth!");

        console.log("🛠️ Listing tools...");
        const tools = await client.listTools();
        console.log("✅ Tools via SSE:", tools.tools.length);
        console.log(
          "🎯 Tool names:",
          tools.tools.map((t) => t.name)
        );
      } catch (sseError) {
        console.log("❌ SSE failed:", sseError.message);
      }
    }
  } catch (error) {
    console.log("❌ MCP Client failed:", error.message);
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (e) {
        // ignore close errors
      }
    }
  }

  // Test 2: Verify auth is still required (should fail without token)
  console.log("\n🚫 Test 2: MCP Client SDK without auth (should fail)");
  let clientNoAuth;
  try {
    clientNoAuth = new Client(
      {
        name: "no-auth-client",
        version: "1.0.0",
      },
      {
        capabilities: { tools: {} },
      }
    );

    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
      {
        requestInit: {
          headers: {
            Accept: "application/json, text/event-stream",
          },
        },
      }
    );

    console.log("🤝 Trying to connect without auth...");
    await clientNoAuth.connect(transport);
    console.log("❌ Unexpected: Connected without auth");

    const tools = await clientNoAuth.listTools();
    console.log("❌ Unexpected: Got tools without auth:", tools.tools.length);
  } catch (error) {
    console.log("✅ Expected: Failed without auth -", error.message);
  } finally {
    if (clientNoAuth) {
      try {
        await clientNoAuth.close();
      } catch (e) {
        // ignore
      }
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("🏁 Debug complete!");
  console.log("💡 If Test 1 works, the fix is confirmed!");
}

debugMCPAuth().catch(console.error);
