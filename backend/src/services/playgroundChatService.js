import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { forwardToOriginalAPI } from "./proxyService.js";

// Create Bedrock client
function createBedrockClient() {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS credentials for Bedrock");
  }

  return new BedrockRuntimeClient({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

/**
 * Get available tools from MCP server (fixed to make direct HTTP call)
 */
export async function getMCPTools(mcpResource) {
  try {
    console.log(`🔍 Getting tools from MCP server: ${mcpResource.name}`);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    // Add authentication if configured
    if (mcpResource.mcpAuth.type === "bearer" && mcpResource.mcpAuth.token) {
      headers["Authorization"] = `Bearer ${mcpResource.mcpAuth.token}`;
    } else if (
      mcpResource.mcpAuth.type === "api_key" &&
      mcpResource.mcpAuth.token
    ) {
      const headerName = mcpResource.mcpAuth.header || "X-API-Key";
      headers[headerName] = mcpResource.mcpAuth.token;
    }

    const response = await fetch(mcpResource.originalUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    const text = await response.text();
    console.log(`📥 MCP Response: ${text.substring(0, 200)}...`);

    // Handle SSE response
    if (text.includes("data: ")) {
      const dataLine = text
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (dataLine) {
        const jsonData = JSON.parse(dataLine.substring(6));
        const tools = jsonData.result?.tools || [];
        console.log(
          `🛠️ Found ${tools.length} tools: ${tools
            .map((t) => t.name)
            .join(", ")}`
        );
        return tools;
      }
    }

    // Handle regular JSON response
    try {
      const jsonData = JSON.parse(text);
      const tools = jsonData.result?.tools || [];
      console.log(
        `🛠️ Found ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`
      );
      return tools;
    } catch {
      console.log("❌ Could not parse MCP response as JSON");
      return [];
    }
  } catch (error) {
    console.error("Failed to get MCP tools:", error.message);
    return [];
  }
}

/**
 * Create system prompt with available tools (GENERIC VERSION)
 */
function createSystemPrompt(mcpTools, mcpServerName) {
  if (!mcpTools || mcpTools.length === 0) {
    return `You are an AI assistant. You currently don't have access to any tools, so please answer questions based on your general knowledge. Be helpful and informative.`;
  }

  const toolDescriptions = mcpTools
    .map((tool) => {
      const params = Object.keys(tool.inputSchema?.properties || {}).join(", ");
      const description = tool.description || "No description available";
      return `- ${tool.name}: ${description} (Parameters: ${params || "none"})`;
    })
    .join("\n");

  return `You are an AI assistant with access to tools from "${mcpServerName}". When a user asks questions that require real-time data, specific information, or actions that these tools can provide, you should use them.

Available tools:
${toolDescriptions}

When you need to use a tool, respond with a JSON object in this EXACT format:
{
  "reasoning": "Brief explanation of why you need this tool",
  "tool_call": {
    "name": "exact_tool_name",
    "parameters": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}

IMPORTANT Guidelines:
- Only suggest tool calls when you need current/live data or specific functionality these tools provide
- If you can answer from your general knowledge without needing current data, respond normally
- Always match tool names and parameters exactly as specified
- Consider the tool descriptions and parameters carefully before making calls
- Be helpful and provide comprehensive answers
- When in doubt about whether to use a tool, consider if the user's question requires real-time or specific data that only the tool can provide`;
}

/**
 * Parse tool call from LLM response (improved)
 */
function parseToolCall(response) {
  try {
    // First try to find complete JSON block
    const jsonMatches = response.match(/\{[\s\S]*?\}/g);

    if (jsonMatches) {
      // Try each JSON block found
      for (const jsonMatch of jsonMatches) {
        try {
          const parsed = JSON.parse(jsonMatch);
          if (parsed.tool_call && parsed.tool_call.name) {
            console.log(`🔧 Parsed tool call: ${parsed.tool_call.name}`);
            console.log(`🤔 Reasoning: ${parsed.reasoning}`);
            return {
              ...parsed.tool_call,
              reasoning: parsed.reasoning,
            };
          }
        } catch (e) {
          // Try next match
          continue;
        }
      }
    }

    // Fallback: try to extract even if JSON is incomplete
    const nameMatch = response.match(/"name":\s*"([^"]+)"/);
    const parametersMatch = response.match(/"parameters":\s*(\{[^}]*\})/);
    const reasoningMatch = response.match(/"reasoning":\s*"([^"]+)"/);

    if (nameMatch) {
      console.log(`🔧 Extracted tool name: ${nameMatch[1]}`);
      let parameters = {};

      if (parametersMatch) {
        try {
          parameters = JSON.parse(parametersMatch[1]);
        } catch (e) {
          console.log("Could not parse parameters, using empty object");
        }
      }

      return {
        name: nameMatch[1],
        parameters: parameters,
        reasoning: reasoningMatch
          ? reasoningMatch[1]
          : "Tool needed to answer this question",
      };
    }
  } catch (error) {
    console.log("Could not parse tool call from response");
  }
  return null;
}

/**
 * Call LLM to determine if tools are needed (improved)
 */
export async function analyzeChatMessage(
  modelId,
  messages,
  mcpTools,
  mcpServerName
) {
  try {
    const client = createBedrockClient();
    const systemPrompt = createSystemPrompt(mcpTools, mcpServerName);

    console.log(`🤖 Analyzing message with ${modelId}...`);

    const response = await client.send(
      new ConverseCommand({
        modelId: modelId,
        messages: messages,
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          temperature: 0.1, // Very low temperature for consistent JSON formatting
          maxTokens: 1500, // Increased to avoid truncation
        },
      })
    );

    const responseText = response.output.message.content
      .filter((content) => content.text)
      .map((content) => content.text)
      .join("\n");

    console.log(`💭 Full LLM Response: ${responseText}`); // Log full response for debugging

    // Check if LLM wants to use a tool
    const toolCall = parseToolCall(responseText);

    if (toolCall) {
      console.log(`🎯 Tool call detected: ${toolCall.name}`);
      console.log(`📝 Parameters:`, toolCall.parameters);
    } else {
      console.log("🤷 No tool call detected in response");
    }

    return {
      response: responseText,
      toolCall: toolCall,
      tokensUsed: response.usage.totalTokens,
      needsPayment: !!toolCall,
    };
  } catch (error) {
    console.error("Error analyzing chat message:", error);
    throw new Error(`LLM analysis failed: ${error.message}`);
  }
}

/**
 * Execute tool call via direct HTTP (similar to getMCPTools)
 */
export async function executeToolCall(mcpResource, toolName, parameters) {
  try {
    console.log(`🔧 Executing tool: ${toolName} with parameters:`, parameters);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    // Add authentication if configured
    if (mcpResource.mcpAuth.type === "bearer" && mcpResource.mcpAuth.token) {
      headers["Authorization"] = `Bearer ${mcpResource.mcpAuth.token}`;
    } else if (
      mcpResource.mcpAuth.type === "api_key" &&
      mcpResource.mcpAuth.token
    ) {
      const headerName = mcpResource.mcpAuth.header || "X-API-Key";
      headers[headerName] = mcpResource.mcpAuth.token;
    }

    const response = await fetch(mcpResource.originalUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: parameters,
        },
      }),
    });

    const text = await response.text();
    console.log(`📥 Tool response: ${text.substring(0, 200)}...`);

    // Handle SSE response
    if (text.includes("data: ")) {
      const dataLine = text
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (dataLine) {
        const jsonData = JSON.parse(dataLine.substring(6));
        console.log("✅ Tool execution successful");
        return jsonData.result;
      }
    }

    // Handle regular JSON response
    try {
      const jsonData = JSON.parse(text);
      console.log("✅ Tool execution successful");
      return jsonData.result;
    } catch {
      console.log("❌ Could not parse tool response as JSON");
      return { error: "Invalid response from tool" };
    }
  } catch (error) {
    console.error("Tool execution failed:", error);
    throw new Error(`Tool execution failed: ${error.message}`);
  }
}

/**
 * Generate final response with tool results
 */
export async function generateFinalResponse(
  modelId,
  originalMessages,
  llmResponse,
  toolName,
  toolResult
) {
  try {
    const client = createBedrockClient();

    console.log("💬 Generating final response with tool data...");

    const finalMessages = [
      ...originalMessages,
      {
        role: "assistant",
        content: [{ text: llmResponse }],
      },
      {
        role: "user",
        content: [
          {
            text: `Here's the result from the ${toolName} tool: ${JSON.stringify(
              toolResult
            )}. Please provide a comprehensive answer based on this data. Don't mention the JSON format, just give a natural response.`,
          },
        ],
      },
    ];

    const response = await client.send(
      new ConverseCommand({
        modelId: modelId,
        messages: finalMessages,
        inferenceConfig: {
          temperature: 0.7,
          maxTokens: 1500,
        },
      })
    );

    const finalText = response.output.message.content
      .filter((content) => content.text)
      .map((content) => content.text)
      .join("\n");

    return {
      response: finalText,
      tokensUsed: response.usage.totalTokens,
    };
  } catch (error) {
    console.error("Error generating final response:", error);
    throw new Error(`Final response generation failed: ${error.message}`);
  }
}

/**
 * Extract transaction details from settlement response (ENHANCED)
 */
export function extractTransactionDetails(settleResponse) {
  console.log("🔍 Settlement response structure:", Object.keys(settleResponse));

  // Settlement response contains blockchain transaction details
  const transaction = settleResponse.transaction;

  if (typeof transaction === "string") {
    // If transaction is just a hash string
    return {
      txHash: transaction,
      blockNumber: null,
      gasUsed: null,
      network: settleResponse.network || "base-sepolia",
      payer: settleResponse.payer,
    };
  } else if (typeof transaction === "object" && transaction) {
    // If transaction is an object with details
    return {
      txHash: transaction.hash || transaction.transactionHash,
      blockNumber: transaction.blockNumber,
      gasUsed: transaction.gasUsed,
      network: settleResponse.network || "base-sepolia",
      payer: settleResponse.payer,
    };
  }

  // Fallback - try different field names
  const txHash =
    settleResponse.transactionHash ||
    settleResponse.txHash ||
    settleResponse.hash;

  console.log(`🔗 Found transaction hash: ${txHash}`);

  return {
    txHash,
    blockNumber: settleResponse.blockNumber,
    gasUsed: settleResponse.gasUsed,
    network: settleResponse.network || "base-sepolia",
    payer: settleResponse.payer,
  };
}
