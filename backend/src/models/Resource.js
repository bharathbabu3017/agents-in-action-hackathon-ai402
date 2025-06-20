import mongoose from "mongoose";

const ResourceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["mcp_server", "ai_model", "api"],
    },
    category: {
      type: String,
      default: "general",
    },
    creatorAddress: {
      type: String,
      required: true,
    },
    originalUrl: {
      type: String,
      required: true,
    },
    proxyUrl: {
      type: String,
    },
    pricing: {
      model: {
        type: String,
        enum: ["per_call", "per_tool"],
        default: "per_call",
      },
      defaultAmount: {
        type: Number,
        required: true,
        min: 0.0001,
        max: 10,
      },
      currency: {
        type: String,
        default: "USDC",
      },
      toolPricing: {
        type: Map,
        of: Number,
        default: new Map(),
      },
      tokenPricing: {
        inputTokenPrice: { type: Number },
        outputTokenPrice: { type: Number },
        maxTokens: { type: Number },
      },
    },
    llmConfig: {
      modelId: String,
      provider: String,
      region: String,
      defaultTemperature: { type: Number, default: 0.7 },
      defaultMaxTokens: { type: Number, default: 1000 },
    },
    // Auth for MCP servers
    mcpAuth: {
      type: {
        type: String,
        enum: ["none", "bearer", "api_key"],
        default: "none",
      },
      token: String,
      header: String,
    },
    // Auth for API and AI model resources
    auth: {
      type: {
        type: String,
        enum: ["none", "bearer", "api_key"],
        default: "none",
      },
      token: String,
      header: String,
    },
    mcpTools: [
      {
        name: String,
        description: String,
        inputSchema: mongoose.Schema.Types.Mixed,
      },
    ],
    stats: {
      totalUses: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      uniqueUsers: { type: Number, default: 0 },
      lastUsed: Date,
      totalTokensUsed: { type: Number, default: 0 },
      totalInputTokens: { type: Number, default: 0 },
      totalOutputTokens: { type: Number, default: 0 },
    },
    starCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate proxy URL before saving - FIXED VERSION
ResourceSchema.pre("save", function (next) {
  if (!this.proxyUrl) {
    const baseProxyUrl = (
      process.env.PROXY_BASE_URL || "https://ai402proxy.xyz"
    ).trim();

    // Extract path from original URL
    let originalPath = "";
    try {
      const url = new URL(this.originalUrl);
      originalPath = url.pathname; // e.g., "/mcp" or "/api/v1"
    } catch (error) {
      console.warn(
        "Invalid originalUrl, using default path:",
        this.originalUrl
      );
      originalPath = "";
    }

    // Remove leading slash if present since we'll add our own structure
    if (originalPath.startsWith("/")) {
      originalPath = originalPath.substring(1);
    }

    // Generate proxy URL with preserved path - ensure no newlines
    if (originalPath) {
      this.proxyUrl =
        `${baseProxyUrl}/proxy/${this.id}/${originalPath}`.replace(/\s/g, "");
    } else {
      this.proxyUrl = `${baseProxyUrl}/proxy/${this.id}`.replace(/\s/g, "");
    }
  }
  next();
});

export default mongoose.model("Resource", ResourceSchema);
