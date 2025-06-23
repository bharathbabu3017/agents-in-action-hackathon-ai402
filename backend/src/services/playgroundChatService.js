import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

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
 * Connect to MCP server using Client SDK with auth + session management
 */
async function connectToMCPServer(mcpResource) {
  console.log(`🔗 Connecting to MCP server: ${mcpResource.name}`);

  const baseUrl = new URL(mcpResource.originalUrl);

  const client = new Client(
    {
      name: "ai402-playground-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        roots: {},
        sampling: {},
        tools: {},
      },
    }
  );

  // ✅ Build auth headers for MCP Client SDK
  const headers = {
    Accept: "application/json, text/event-stream",
  };

  // Add authentication if configured
  if (mcpResource.mcpAuth && mcpResource.mcpAuth.type !== "none") {
    if (mcpResource.mcpAuth.type === "bearer" && mcpResource.mcpAuth.token) {
      headers["Authorization"] = `Bearer ${mcpResource.mcpAuth.token}`;
    } else if (
      mcpResource.mcpAuth.type === "api_key" &&
      mcpResource.mcpAuth.token
    ) {
      const headerName = mcpResource.mcpAuth.header || "X-API-Key";
      headers[headerName] = mcpResource.mcpAuth.token;
    }
  }

  let transport;
  let transportUsed = "unknown";

  try {
    transport = new StreamableHTTPClientTransport(baseUrl, {
      requestInit: {
        headers, // ✅ FIXED: Headers inside requestInit!
      },
    });
    await client.connect(transport);
    transportUsed = "StreamableHTTP";
    console.log(`✅ Connected to ${mcpResource.name} using Streamable HTTP`);
  } catch (error) {
    console.log(
      `⚠️ Streamable HTTP failed for ${mcpResource.name}, trying SSE...`
    );
    try {
      transport = new SSEClientTransport(baseUrl, {
        requestInit: {
          headers, // ✅ FIXED: Headers inside requestInit!
        },
      });
      await client.connect(transport);
      transportUsed = "SSE";
      console.log(`✅ Connected to ${mcpResource.name} using SSE`);
    } catch (sseError) {
      throw new Error(
        `Failed to connect with both transports. StreamableHTTP: ${error.message}, SSE: ${sseError.message}`
      );
    }
  }

  return { client, transportUsed };
}

/**
 * Get available tools from MCP server using Client SDK
 */
export async function getMCPTools(mcpResource) {
  let client;
  try {
    console.log(`🔍 Getting tools from MCP server: ${mcpResource.name}`);

    const { client: mcpClient, transportUsed } = await connectToMCPServer(
      mcpResource
    );
    client = mcpClient;

    // Use MCP Client SDK to list tools
    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    console.log(
      `🛠️ Found ${tools.length} tools using ${transportUsed}: ${tools
        .map((t) => t.name)
        .join(", ")}`
    );

    return tools;
  } catch (error) {
    console.error("Failed to get MCP tools:", error.message);
    return [];
  } finally {
    if (client) {
      try {
        await client.close();
        console.log("🔌 MCP client connection closed");
      } catch (closeError) {
        console.warn("Error closing MCP client:", closeError.message);
      }
    }
  }
}

/**
 * Convert MCP tools to Bedrock tool schema format
 */
function toolsToBedrockSchema(mcpTools) {
  if (!mcpTools || mcpTools.length === 0) {
    return { tools: [] };
  }

  const tools = mcpTools.map((tool) => {
    let props = {};
    if (tool.inputSchema?.properties) {
      Object.keys(tool.inputSchema.properties).forEach((prop) => {
        props[prop] = {
          type: tool.inputSchema.properties[prop].type,
          description: tool.inputSchema.properties[prop]?.description || prop,
        };
      });
    }

    return {
      toolSpec: {
        name: tool.name,
        description: tool?.description || tool.name,
        inputSchema: {
          json: {
            type: tool.inputSchema?.type || "object",
            properties: props,
            required: tool.inputSchema?.required || [],
          },
        },
      },
    };
  });

  return { tools };
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
 * Execute tool call using MCP Client SDK (DEBUG VERSION)
 */
export async function executeToolCall(mcpResource, toolName, parameters) {
  let client;
  try {
    console.log(`🔧 Executing tool: ${toolName} with parameters:`, parameters);

    const { client: mcpClient, transportUsed } = await connectToMCPServer(
      mcpResource
    );
    client = mcpClient;

    // Use MCP Client SDK to call tool
    const toolResult = await client.callTool({
      name: toolName,
      arguments: parameters,
    });

    console.log(`✅ Tool execution successful using ${transportUsed}`);
    console.log(`🔍 DEBUG - Tool result type:`, typeof toolResult);
    console.log(
      `🔍 DEBUG - Tool result keys:`,
      toolResult ? Object.keys(toolResult) : "null"
    );
    console.log(
      `🔍 DEBUG - Full tool result:`,
      JSON.stringify(toolResult, null, 2)
    );

    return toolResult;
  } catch (error) {
    console.error("Tool execution failed:", error);
    throw new Error(`Tool execution failed: ${error.message}`);
  } finally {
    if (client) {
      try {
        await client.close();
        console.log("🔌 MCP client connection closed");
      } catch (closeError) {
        console.warn("Error closing MCP client:", closeError.message);
      }
    }
  }
}

/**
 * Generate final response with tool results (DEBUG VERSION)
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

    // ✅ DEBUG: Log all inputs
    console.log("🔍 DEBUG - Input parameters:");
    console.log("  modelId:", modelId);
    console.log(
      "  originalMessages:",
      JSON.stringify(originalMessages, null, 2)
    );
    console.log("  llmResponse:", llmResponse);
    console.log("  toolName:", toolName);
    console.log("  toolResult type:", typeof toolResult);
    console.log("  toolResult:", JSON.stringify(toolResult, null, 2));

    // ✅ FIXED: Safely extract user message
    let userMessage;
    try {
      if (originalMessages && originalMessages.length > 0) {
        const lastMessage = originalMessages[originalMessages.length - 1];
        console.log(
          "🔍 DEBUG - Last message structure:",
          JSON.stringify(lastMessage, null, 2)
        );

        if (
          lastMessage &&
          lastMessage.content &&
          Array.isArray(lastMessage.content)
        ) {
          if (lastMessage.content[0] && lastMessage.content[0].text) {
            userMessage = lastMessage.content[0].text;
          } else {
            console.warn("⚠️ Last message content[0] missing text property");
            userMessage = "Previous user question";
          }
        } else {
          console.warn("⚠️ Last message missing content array");
          userMessage = "Previous user question";
        }
      } else {
        console.warn("⚠️ No original messages provided");
        userMessage = "Previous user question";
      }
    } catch (msgError) {
      console.error("❌ Error extracting user message:", msgError);
      userMessage = "Previous user question";
    }

    console.log("🔍 DEBUG - Extracted user message:", userMessage);

    // ✅ FIXED: Format tool result safely
    let toolResultText;
    try {
      if (typeof toolResult === "string") {
        toolResultText = toolResult;
      } else if (toolResult && typeof toolResult === "object") {
        // Handle MCP Client SDK response format
        if (toolResult.content && Array.isArray(toolResult.content)) {
          // Extract text from MCP response content
          toolResultText = toolResult.content
            .filter((item) => item && item.type === "text")
            .map((item) => item.text)
            .join("\n");
        } else {
          toolResultText = JSON.stringify(toolResult, null, 2);
        }
      } else {
        toolResultText = String(toolResult || "No result");
      }
    } catch (stringifyError) {
      console.warn("Could not stringify tool result:", stringifyError);
      toolResultText =
        "Tool executed successfully but result could not be displayed.";
    }

    console.log("🔍 DEBUG - Formatted tool result:", toolResultText);

    // ✅ FIXED: Handle undefined llmResponse safely
    const safeAssistantContent =
      llmResponse || `I used the ${toolName} tool to help you.`;

    const finalMessages = [
      {
        role: "user",
        content: [{ text: userMessage }],
      },
      {
        role: "assistant",
        content: [{ text: safeAssistantContent }], // ✅ Safe content
      },
      {
        role: "user",
        content: [
          {
            text: `Here's the result from the ${toolName} tool: ${toolResultText}. Please provide a comprehensive answer based on this data. Don't mention the JSON format, just give a natural response.`,
          },
        ],
      },
    ];

    console.log("🔍 DEBUG - Final messages structure:");
    console.log(JSON.stringify(finalMessages, null, 2));

    // ✅ Validate message structure before sending
    for (let i = 0; i < finalMessages.length; i++) {
      const msg = finalMessages[i];
      if (!msg.role || !msg.content || !Array.isArray(msg.content)) {
        throw new Error(
          `Invalid message structure at index ${i}: missing role or content array`
        );
      }
      for (let j = 0; j < msg.content.length; j++) {
        const content = msg.content[j];
        if (!content || typeof content.text !== "string") {
          throw new Error(
            `Invalid content structure at message ${i}, content ${j}: missing text property`
          );
        }
      }
    }

    console.log("✅ Message structure validation passed");

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

    console.log(
      "🔍 DEBUG - Bedrock response structure:",
      JSON.stringify(response.output, null, 2)
    );

    // ✅ FIXED: Safe content extraction
    const finalText = response.output.message.content
      .filter((content) => content && content.text)
      .map((content) => content.text)
      .join("\n");

    return {
      response: finalText,
      tokensUsed: response.usage.totalTokens,
    };
  } catch (error) {
    console.error("❌ Error generating final response:", error);
    console.error("❌ Error stack:", error.stack);
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
