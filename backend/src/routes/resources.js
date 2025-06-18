import express from "express";
import Resource from "../models/Resource.js";
import { getMCPTools } from "../services/mcpService.js";

const router = express.Router();

// Get all resources for marketplace
router.get("/", async (req, res) => {
  try {
    const { type, category, search } = req.query;

    let query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const resources = await Resource.find(query)
      .sort({ createdAt: -1 })
      .select("-mcpAuth.token"); // Don't expose auth tokens

    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific resource details
router.get("/:id", async (req, res) => {
  try {
    const resource = await Resource.findOne({ id: req.params.id }).select(
      "-mcpAuth.token"
    ); // Don't expose auth tokens

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

    res.status(201).json(resource);
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

export default router;
