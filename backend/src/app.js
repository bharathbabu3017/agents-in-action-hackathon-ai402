import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import { paymentMiddleware } from "x402-express";
import resourceRoutes from "./routes/resources.js";
import proxyRoutes from "./routes/proxy.js";
import playgroundRoutes from "./routes/playground.js";

config();

const app = express();

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("📊 Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware - Allow all origins for hackathon demo
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "AI402 Backend is running!",
  });
});

// Routes (order matters - proxy routes need to be before payment middleware)
app.use("/api/resources", resourceRoutes);
app.use("/api/playground", playgroundRoutes);

// Configure x402 payment middleware for proxy routes
const facilitatorUrl = process.env.FACILITATOR_URL;

if (!facilitatorUrl) {
  console.error("❌ Missing FACILITATOR_URL");
  process.exit(1);
}

// Payment middleware for proxy routes
// Note: payTo address will be set dynamically per resource
app.use(
  paymentMiddleware(
    "0x0000000000000000000000000000000000000000", // Placeholder - overridden per request
    {
      // Dynamic pricing - will be overridden by proxy handler
      "GET /proxy/*": { price: "$0.001", network: "base-sepolia" },
      "POST /proxy/*": { price: "$0.001", network: "base-sepolia" },
      "PUT /proxy/*": { price: "$0.001", network: "base-sepolia" },
      "DELETE /proxy/*": { price: "$0.001", network: "base-sepolia" },
    },
    { url: facilitatorUrl }
  )
);

// Proxy routes (after payment middleware)
app.use("/proxy", proxyRoutes);

// Error handling
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 AI402 Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Payment facilitator: ${facilitatorUrl}`);
  console.log(`🌍 CORS: Allowing all origins`);
});

export default app;
