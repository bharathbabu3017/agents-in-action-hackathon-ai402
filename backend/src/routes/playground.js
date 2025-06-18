import express from "express";
// Placeholder for playground routes
const router = express.Router();

router.post("/chat", async (req, res) => {
  res.json({ message: "Playground endpoint placeholder" });
});

export default router;
