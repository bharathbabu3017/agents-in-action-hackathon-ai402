import mongoose from "mongoose";
import { config } from "dotenv";
import Resource from "../src/models/Resource.js";

config();

const MCP_SERVERS = [
  {
    name: "Solana Expert MCP Server",
    description:
      "Comprehensive Solana blockchain tools including documentation search, Anchor framework expertise, and ecosystem guidance",
    originalUrl: "https://mcp.solana.com/mcp",
    creatorAddress: "0xe8faD77E45dfb4127d4b484a85cc6047CF012935",
    category: "blockchain",
    tags: ["solana", "blockchain", "defi", "anchor", "documentation"],
    pricing: {
      model: "per_call",
      defaultAmount: 0.001, // $0.001 per tool call
    },
    mcpAuth: {
      type: "none", // Public MCP server
    },
  },
  {
    name: "Authenticated MCP Test Server",
    description:
      "A test MCP server that requires API key authentication. Provides weather, calculator, and time tools for testing x402 payment flows.",
    originalUrl: "http://localhost:3002/mcp",
    creatorAddress: "0xe8faD77E45dfb4127d4b484a85cc6047CF012935",
    category: "development",
    tags: ["test", "authentication", "demo", "weather", "calculator", "time"],
    pricing: {
      model: "per_tool", // Different pricing per tool
      defaultAmount: 0.001,
      toolPricing: new Map([
        ["get_weather", 0.001], // $0.001 for weather
        ["calculate", 0.0005], // $0.0005 for calculations
        ["get_time", 0.0002], // $0.0002 for time
      ]),
    },
    mcpAuth: {
      type: "api_key",
      token: "test-api-key-123", // Proxy will use this automatically
      header: "X-API-Key",
    },
  },
];

async function seedMCPResources() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n🛠️  Seeding MCP Server Resources...");

    for (const serverData of MCP_SERVERS) {
      console.log(`\n📡 Processing: ${serverData.name}`);

      // Check if resource already exists
      const existing = await Resource.findOne({ name: serverData.name });

      if (existing) {
        console.log(`♻️  Updating existing resource: ${existing.id}`);
        Object.assign(existing, {
          ...serverData,
          type: "mcp_server",
          isActive: true,
        });
        await existing.save();

        console.log(`✅ Updated: ${serverData.name}`);
        console.log(`   ID: ${existing.id}`);
        console.log(`   Original URL: ${existing.originalUrl}`);
        console.log(`   Proxy URL: ${existing.proxyUrl}`);
        console.log(`   Auth: ${existing.mcpAuth.type}`);
        console.log(
          `   Pricing: ${existing.pricing.model} ($${existing.pricing.defaultAmount})`
        );
      } else {
        console.log(`🆕 Creating new resource...`);
        const resource = new Resource({
          ...serverData,
          type: "mcp_server",
          isActive: true,
        });
        await resource.save();

        console.log(`✅ Created: ${serverData.name}`);
        console.log(`   ID: ${resource.id}`);
        console.log(`   Original URL: ${resource.originalUrl}`);
        console.log(`   Proxy URL: ${resource.proxyUrl}`);
        console.log(`   Auth: ${resource.mcpAuth.type}`);
        console.log(
          `   Pricing: ${resource.pricing.model} ($${resource.pricing.defaultAmount})`
        );
      }
    }

    console.log(`\n🎯 Seeding Summary:`);
    console.log(`   Total MCP servers: ${MCP_SERVERS.length}`);
    console.log(
      `   Categories: ${[...new Set(MCP_SERVERS.map((s) => s.category))].join(
        ", "
      )}`
    );
    console.log(
      `   Auth types: ${[
        ...new Set(MCP_SERVERS.map((s) => s.mcpAuth.type)),
      ].join(", ")}`
    );

    console.log(`\n🧪 Test your MCP servers:`);
    console.log(`   # Get all resources`);
    console.log(`   curl http://localhost:3001/api/resources`);
    console.log(`\n   # Test free tools/list (no auth headers needed!)`);
    console.log(
      `   curl -X POST http://localhost:3001/proxy/{resource-id}/mcp \\`
    );
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(
      `     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`
    );
    console.log(
      `\n   # Test paid tools/call (will get 402, then use x402-axios)`
    );
    console.log(
      `   curl -X POST http://localhost:3001/proxy/{resource-id}/mcp \\`
    );
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(
      `     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_weather","arguments":{"city":"SF"}}}'`
    );

    // Special note for the test server
    console.log(`\n🔐 Test the authenticated MCP server:`);
    console.log(`   1. Start the test server: cd test-mcp-server && npm start`);
    console.log(
      `   2. Find the resource ID for "Authenticated MCP Test Server"`
    );
    console.log(
      `   3. Test tools/list (should work - auth handled transparently)`
    );
    console.log(
      `   4. Test tools/call (should get 402, then work with payment)`
    );
  } catch (error) {
    console.error("❌ Error seeding MCP resources:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMCPResources().catch(console.error);
}
