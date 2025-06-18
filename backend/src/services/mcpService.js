export async function getMCPTools(mcpUrl) {
  try {
    const response = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    const text = await response.text();

    // Handle SSE response
    if (text.includes("data: ")) {
      const dataLine = text
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (dataLine) {
        const jsonData = JSON.parse(dataLine.substring(6));
        return jsonData.result?.tools || [];
      }
    }

    // Handle regular JSON response
    try {
      const jsonData = JSON.parse(text);
      return jsonData.result?.tools || [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error("Error fetching MCP tools:", error.message);
    return [];
  }
}
