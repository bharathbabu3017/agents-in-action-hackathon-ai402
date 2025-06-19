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

    // Add server-stored authentication if configured (for server's own auth)
    if (resource.mcpAuth?.type === "bearer" && resource.mcpAuth.token) {
      headers["Authorization"] = `Bearer ${resource.mcpAuth.token}`;
    } else if (resource.mcpAuth?.type === "api_key" && resource.mcpAuth.token) {
      const headerName = resource.mcpAuth.header || "X-API-Key";
      headers[headerName] = resource.mcpAuth.token;
    }

    const response = await fetch(resource.originalUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

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
