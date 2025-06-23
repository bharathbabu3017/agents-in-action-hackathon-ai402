import express from "express";
import Resource from "../models/Resource.js";
import { getMCPTools } from "../services/mcpService.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const router = express.Router();

// Get all resources for marketplace
router.get("/", async (req, res) => {
  try {
    const { type, category } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;

    const resources = await Resource.find(filter)
      .select("-mcpAuth.token") // Don't expose auth tokens
      .sort({ createdAt: -1 }); // Most recent first

    res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({
      error: "Failed to fetch resources",
      message: error.message,
    });
  }
});

// Get specific resource details
router.get("/:id", async (req, res) => {
  try {
    const resource = await Resource.findOne({ id: req.params.id }).select(
      "-mcpAuth.token -originalUrl"
    ); // Don't expose auth tokens or original URLs

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new resource
router.post("/", async (req, res) => {
  try {
    const resourceData = {
      ...req.body,
      id: crypto.randomUUID(),
    };

    const resource = new Resource(resourceData);

    // If it's an MCP server, try to fetch available tools
    if (resource.type === "mcp_server") {
      try {
        const tools = await getMCPTools(resource.originalUrl);
        resource.mcpTools = tools;
        console.log(`✅ Fetched ${tools.length} tools for ${resource.name}`);
      } catch (error) {
        console.log(
          `⚠️ Could not fetch tools for ${resource.name}:`,
          error.message
        );
      }
    }

    await resource.save();

    // Return the resource without sensitive fields
    const responseResource = await Resource.findOne({ id: resource.id }).select(
      "-mcpAuth.token -originalUrl"
    );

    res.status(201).json(responseResource);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: "Resource with this name already exists" });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Get resource statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const resource = await Resource.findOne({ id: req.params.id }).select(
      "name stats"
    );

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json({
      name: resource.name,
      ...resource.stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/resources/:id/star
 * @desc    Add a star to a resource
 * @access  Public
 */
router.post("/:id/star", async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findOneAndUpdate(
      { id },
      { $inc: { starCount: 1 } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({
        error: "Resource not found",
      });
    }

    res.json({
      success: true,
      resourceId: resource.id,
      resourceName: resource.name,
      starCount: resource.starCount,
    });
  } catch (error) {
    console.error("Add star error:", error);
    res.status(500).json({
      error: "Failed to add star",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/resources/:id/stars
 * @desc    Get star count for a resource
 * @access  Public
 */
router.get("/:id/stars", async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findOne({ id }).select("id name starCount");

    if (!resource) {
      return res.status(404).json({
        error: "Resource not found",
      });
    }

    res.json({
      resourceId: resource.id,
      resourceName: resource.name,
      starCount: resource.starCount,
    });
  } catch (error) {
    console.error("Get stars error:", error);
    res.status(500).json({
      error: "Failed to get star count",
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/resources/fetch-mcp-tools
 * @desc    Fetch tools from an MCP server URL (for form preview)
 * @access  Public
 */
router.post("/fetch-mcp-tools", async (req, res) => {
  let client;
  try {
    const { url, auth } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log(`🔍 Fetching MCP tools from: ${url}`);
    console.log(`🔐 Auth config:`, auth);

    // Convert to URL object
    const baseUrl = new URL(url);

    // Build complete headers with auth
    const headers = {
      Accept: "application/json, text/event-stream",
    };

    // Add auth headers if provided
    if (auth && auth.type !== "none" && auth.token) {
      if (auth.type === "bearer") {
        headers["Authorization"] = `Bearer ${auth.token}`;
        console.log(
          `🔐 Using Bearer auth: Authorization: Bearer ${auth.token.substring(
            0,
            10
          )}...`
        );
      } else if (auth.type === "api_key" && auth.header) {
        headers[auth.header] = auth.token;
        console.log(
          `🔐 Using API Key auth: ${auth.header}: ${auth.token.substring(
            0,
            10
          )}...`
        );
      }
    }

    console.log(`🔗 Headers for MCP connection:`, Object.keys(headers));

    // Create MCP client
    client = new Client(
      {
        name: "AI402-Tools-Fetcher",
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

    // ✅ Try connection with CORRECT header format
    let transport;
    let transportUsed = "unknown";

    try {
      console.log(`🤝 Attempting StreamableHTTP connection...`);
      transport = new StreamableHTTPClientTransport(baseUrl, {
        requestInit: {
          headers, // ✅ FIXED: Headers inside requestInit!
        },
      });
      await client.connect(transport);
      transportUsed = "StreamableHTTP";
      console.log(`✅ Connected using StreamableHTTP - session established`);
    } catch (streamableError) {
      console.log(`⚠️ StreamableHTTP failed: ${streamableError.message}`);
      console.log(`🔄 Trying SSE transport...`);

      try {
        transport = new SSEClientTransport(baseUrl, {
          requestInit: {
            headers, // ✅ FIXED: Headers inside requestInit!
          },
        });
        await client.connect(transport);
        transportUsed = "SSE";
        console.log(`✅ Connected using SSE - session established`);
      } catch (sseError) {
        console.log(`❌ SSE also failed: ${sseError.message}`);
        throw new Error(
          `Failed to connect with both transports. StreamableHTTP: ${streamableError.message}, SSE: ${sseError.message}`
        );
      }
    }

    // Now fetch tools (session is established)
    console.log(`🛠️ Fetching tools from established session...`);
    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    console.log(
      `✅ Successfully fetched ${tools.length} tools using ${transportUsed} transport`
    );

    return res.json({
      success: true,
      tools,
      transport: transportUsed,
      count: tools.length,
    });
  } catch (error) {
    console.error("Error fetching MCP tools:", error);
    return res.status(500).json({
      error: "Failed to fetch MCP tools",
      message: error.message,
    });
  } finally {
    if (client) {
      try {
        await client.close();
        console.log("🔌 MCP client connection closed");
      } catch (closeError) {
        console.error("Error closing MCP client:", closeError);
      }
    }
  }
});

/**
 * @route   GET /api/resources/:id/transactions
 * @desc    Get transaction history for a resource
 * @access  Public
 */
router.get("/:id/transactions", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const resource = await Resource.findOne({ id }).select("id name");
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Import Transaction model
    const { default: Transaction } = await import("../models/Transaction.js");

    const transactions = await Transaction.find({ resourceId: id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-requestData"); // Don't expose full request data for privacy

    const totalTransactions = await Transaction.countDocuments({
      resourceId: id,
    });

    res.json({
      transactions,
      totalTransactions,
      totalPages: Math.ceil(totalTransactions / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      error: "Failed to get transactions",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/resources/:id/tools
 * @desc    Get tools for a specific MCP resource (for frontend)
 * @access  Public
 */
router.get("/:id/tools", async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    // Get the resource
    const resource = await Resource.findOne({ id }).select(
      "originalUrl name type mcpAuth"
    );
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.type !== "mcp_server") {
      return res.status(400).json({ error: "Resource is not an MCP server" });
    }

    console.log(`🔍 Fetching tools for resource: ${resource.name}`);

    // Use MCP Client SDK to fetch tools from original URL
    const baseUrl = new URL(resource.originalUrl);

    client = new Client(
      {
        name: "ai402-resource-tools-fetcher",
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

    // ✅ Prepare auth headers based on resource configuration
    const authHeaders = {
      Accept: "application/json, text/event-stream",
    };
    if (resource.mcpAuth && resource.mcpAuth.type !== "none") {
      if (resource.mcpAuth.type === "bearer" && resource.mcpAuth.token) {
        authHeaders["Authorization"] = `Bearer ${resource.mcpAuth.token}`;
      } else if (
        resource.mcpAuth.type === "api_key" &&
        resource.mcpAuth.token
      ) {
        const headerName = resource.mcpAuth.header || "X-API-Key";
        authHeaders[headerName] = resource.mcpAuth.token;
      }
    }

    // Try transport fallback with auth headers
    let transport;
    let transportUsed = "unknown";

    try {
      transport = new StreamableHTTPClientTransport(baseUrl, {
        requestInit: {
          headers: authHeaders,
        },
      });
      await client.connect(transport);
      transportUsed = "StreamableHTTP";
      console.log("✅ Connected using Streamable HTTP transport with auth");
    } catch (error) {
      console.log("⚠️ Streamable HTTP failed, trying SSE transport with auth");
      try {
        transport = new SSEClientTransport(baseUrl, {
          requestInit: {
            headers: authHeaders,
          },
        });
        await client.connect(transport);
        transportUsed = "SSE";
        console.log("✅ Connected using SSE transport with auth");
      } catch (sseError) {
        throw new Error(
          `Failed to connect with both transports. StreamableHTTP: ${error.message}, SSE: ${sseError.message}`
        );
      }
    }

    // Fetch tools
    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    console.log(
      `✅ Successfully fetched ${tools.length} tools using ${transportUsed} transport`
    );

    res.json({
      success: true,
      tools,
      count: tools.length,
      transport: transportUsed,
    });
  } catch (error) {
    console.error("Error fetching resource tools:", error);
    res.status(500).json({
      error: "Failed to fetch resource tools",
      message: error.message,
    });
  } finally {
    if (client) {
      try {
        await client.close();
        console.log("🔌 MCP client connection closed");
      } catch (closeError) {
        console.warn("Error closing MCP client:", closeError.message);
      }
    }
  }
});

export default router;
