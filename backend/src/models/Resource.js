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
    },
    mcpAuth: {
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

// Generate proxy URL before saving
ResourceSchema.pre("save", function (next) {
  if (!this.proxyUrl) {
    this.proxyUrl = `${
      process.env.PROXY_BASE_URL || "https://ai402proxy.xyz"
    }/proxy/${this.id}`;
  }
  next();
});

export default mongoose.model("Resource", ResourceSchema);
