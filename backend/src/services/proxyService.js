export async function forwardToOriginalAPI(resource, req) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: req.headers.accept || "application/json, text/event-stream",
    };

    // ✅ Forward MCP session headers from client
    if (resource.type === "mcp_server") {
      // Pass through session ID if client provided it
      if (req.headers["mcp-session-id"]) {
        headers["mcp-session-id"] = req.headers["mcp-session-id"];
        console.log(
          `🔄 Forwarding session ID: ${req.headers["mcp-session-id"]}`
        );
      }

      // Pass through protocol version if client provided it
      if (req.headers["mcp-protocol-version"]) {
        headers["mcp-protocol-version"] = req.headers["mcp-protocol-version"];
      }
    }

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

    // ✅ Forward session headers back to client
    const responseHeaders = {};
    if (resource.type === "mcp_server") {
      // Forward session ID back to client
      const sessionId = response.headers.get("mcp-session-id");
      if (sessionId) {
        responseHeaders["mcp-session-id"] = sessionId;
        console.log(`📤 Forwarding session ID back to client: ${sessionId}`);
      }
    }

    const text = await response.text();

    // ✅ Debug logging for MCP responses
    if (resource.type === "mcp_server") {
      console.log(
        `🔍 Raw MCP response (first 200 chars): ${text.substring(0, 200)}`
      );
    }

    // ✅ For MCP servers, preserve exact JSON-RPC format
    if (resource.type === "mcp_server") {
      // Handle SSE response format
      if (text.includes("data: ")) {
        const dataLines = text
          .split("\n")
          .filter((line) => line.startsWith("data: "));
        if (dataLines.length > 0) {
          const lastDataLine = dataLines[dataLines.length - 1];
          try {
            const parsedResponse = JSON.parse(lastDataLine.substring(6));
            console.log(`✅ Parsed SSE response:`, parsedResponse);
            return { response: parsedResponse, headers: responseHeaders };
          } catch (parseError) {
            console.error("Failed to parse SSE data:", parseError);
            return {
              response: {
                jsonrpc: "2.0",
                id: req.body?.id || null,
                error: {
                  code: -32700,
                  message: "Parse error: Invalid SSE response format",
                },
              },
              headers: responseHeaders,
            };
          }
        }
      }

      // Handle regular JSON response - preserve exact format
      try {
        const jsonResponse = JSON.parse(text);
        console.log(`✅ Parsed JSON response:`, jsonResponse);
        return { response: jsonResponse, headers: responseHeaders };
      } catch (parseError) {
        console.error("Failed to parse MCP response:", parseError);
        console.error("Raw response text:", text);

        // Return proper JSON-RPC error format
        return {
          response: {
            jsonrpc: "2.0",
            id: req.body?.id || null,
            error: {
              code: -32700,
              message: `Parse error: ${parseError.message}`,
            },
          },
          headers: responseHeaders,
        };
      }
    }

    // Handle other resource types as before...
    if (text.includes("data: ")) {
      const dataLine = text
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (dataLine) {
        return JSON.parse(dataLine.substring(6));
      }
    }

    try {
      return { response: JSON.parse(text), headers: {} };
    } catch {
      return { response: text };
    }
  } catch (error) {
    console.error("Error forwarding to original API:", error.message);

    // ✅ For MCP servers, return proper JSON-RPC error format
    if (resource.type === "mcp_server") {
      return {
        response: {
          jsonrpc: "2.0",
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: "Internal error",
            data: error.message,
          },
        },
        headers: {},
      };
    }

    throw new Error(`Failed to connect to original API: ${error.message}`);
  }
}
