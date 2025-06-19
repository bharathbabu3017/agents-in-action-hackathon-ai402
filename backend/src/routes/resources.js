import express from "express";
import Resource from "../models/Resource.js";
import { getMCPTools } from "../services/mcpService.js";

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

export default router;
