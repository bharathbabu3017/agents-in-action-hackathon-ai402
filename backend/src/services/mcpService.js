import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export async function getMCPTools(mcpUrl) {
  let client;
  try {
    console.log(`🔍 Fetching MCP tools from: ${mcpUrl}`);

    const baseUrl = new URL(mcpUrl);

    client = new Client(
      {
        name: "ai402-mcp-client",
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

    // Try transport fallback
    let transport;

    try {
      transport = new StreamableHTTPClientTransport(baseUrl);
      await client.connect(transport);
      console.log("✅ Connected using Streamable HTTP transport");
    } catch (error) {
      console.log("⚠️ Streamable HTTP failed, trying SSE transport");
      try {
        transport = new SSEClientTransport(baseUrl);
        await client.connect(transport);
        console.log("✅ Connected using SSE transport");
      } catch (sseError) {
        throw new Error(
          `Failed to connect with both transports: ${error.message}`
        );
      }
    }

    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    console.log(`✅ Successfully fetched ${tools.length} tools`);
    return tools;
  } catch (error) {
    console.error("Error fetching MCP tools:", error.message);
    return [];
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.warn("Error closing MCP client:", closeError.message);
      }
    }
  }
}
