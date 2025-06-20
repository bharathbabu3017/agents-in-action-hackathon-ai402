export async function forwardToOriginalAPI(resource, req) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: req.headers.accept || "application/json, text/event-stream",
    };

    // Forward user-provided authentication headers (for user's own API keys)
    if (req.headers["x-api-key"]) {
      headers["X-API-Key"] = req.headers["x-api-key"];
    }
    if (req.headers["authorization"]) {
      headers["Authorization"] = req.headers["authorization"];
    }

    // Add server-stored authentication based on resource type
    let authConfig = null;

    if (resource.type === "mcp_server") {
      authConfig = resource.mcpAuth;
    } else if (resource.type === "api" || resource.type === "ai_model") {
      authConfig = resource.auth;
    }

    // Apply server-stored authentication if configured
    if (authConfig?.type === "bearer" && authConfig.token) {
      headers["Authorization"] = `Bearer ${authConfig.token}`;
    } else if (authConfig?.type === "api_key" && authConfig.token) {
      const headerName = authConfig.header || "X-API-Key";
      headers[headerName] = authConfig.token;
    }

    console.log(
      `🔗 Forwarding ${req.method} request to: ${resource.originalUrl}`
    );
    console.log(`🔐 Auth type: ${authConfig?.type || "none"}`);

    const response = await fetch(resource.originalUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    console.log(`📡 Response status: ${response.status}`);

    const text = await response.text();

    // Handle SSE response (for MCP servers)
    if (text.includes("data: ")) {
      const dataLine = text
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (dataLine) {
        return JSON.parse(dataLine.substring(6));
      }
    }

    // Handle regular JSON response
    try {
      return JSON.parse(text);
    } catch {
      return { result: text };
    }
  } catch (error) {
    console.error("Error forwarding to original API:", error.message);
    throw new Error(`Failed to connect to original API: ${error.message}`);
  }
}
