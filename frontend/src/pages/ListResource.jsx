import React, { useState } from "react";
import {
  ArrowLeft,
  Server,
  Brain,
  Database,
  Zap,
  DollarSign,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader,
  Info,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

const ListResource = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "mcp_server",
    category: "general",
    creatorAddress: "",
    originalUrl: "",
    documentation: "",
    pricing: {
      model: "per_call",
      defaultAmount: 0.001,
      currency: "USDC",
      toolPricing: {},
    },
    auth: {
      type: "none",
      token: "",
      header: "X-API-Key",
    },
  });

  const [toolPricingEntries, setToolPricingEntries] = useState([]);
  const [mcpTools, setMcpTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const categories = [
    "general",
    "ai",
    "blockchain",
    "development",
    "finance",
    "weather",
    "data",
    "productivity",
    "social",
    "entertainment",
  ];

  const handleInputChange = (path, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const getExamplePlaceholder = (type) => {
    if (type === "api") {
      return '{"method": "POST", "url": "https://api.example.com/endpoint", "body": {"key": "value"}}';
    }
    return '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}';
  };

  const fetchMCPTools = async (url) => {
    if (!url || formData.type !== "mcp_server") return;

    setLoadingTools(true);
    setToolsError("");
    setMcpTools([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/resources/fetch-mcp-tools`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
            auth: formData.auth,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        const tools = data.tools || [];
        setMcpTools(tools);

        // If switching to per_tool pricing, pre-populate tools
        if (formData.pricing.model === "per_tool") {
          const newEntries = tools.map((tool) => ({
            name: tool.name,
            price: 0.001,
          }));
          setToolPricingEntries(newEntries);

          // Update formData
          const toolPricing = {};
          newEntries.forEach((entry) => {
            toolPricing[entry.name] = entry.price;
          });
          handleInputChange("pricing.toolPricing", toolPricing);
        }
      } else {
        throw new Error(data.message || "Failed to fetch tools");
      }
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      setToolsError(error.message);
      setMcpTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleUrlChange = (url) => {
    handleInputChange("originalUrl", url);
    // Auto-fetch tools for MCP servers
    if (formData.type === "mcp_server" && url) {
      // Debounce the API call
      setTimeout(() => fetchMCPTools(url), 500);
    }
  };

  const handlePricingModelChange = (model) => {
    handleInputChange("pricing.model", model);

    // If switching to per_tool and we have MCP tools, pre-populate
    if (model === "per_tool" && mcpTools.length > 0) {
      const newEntries = mcpTools.map((tool) => ({
        name: tool.name,
        price: 0.001,
      }));
      setToolPricingEntries(newEntries);

      const toolPricing = {};
      newEntries.forEach((entry) => {
        toolPricing[entry.name] = entry.price;
      });
      handleInputChange("pricing.toolPricing", toolPricing);
    } else if (model === "per_call") {
      // Clear tool pricing when switching back
      setToolPricingEntries([]);
      handleInputChange("pricing.toolPricing", {});
    }
  };

  const addToolPricingEntry = () => {
    setToolPricingEntries([...toolPricingEntries, { name: "", price: 0.001 }]);
  };

  const updateToolPricingEntry = (index, field, value) => {
    const updated = [...toolPricingEntries];
    updated[index][field] = value;
    setToolPricingEntries(updated);

    // Update formData
    const toolPricing = {};
    updated.forEach((entry) => {
      if (entry.name && entry.price) {
        toolPricing[entry.name] = parseFloat(entry.price);
      }
    });
    handleInputChange("pricing.toolPricing", toolPricing);
  };

  const removeToolPricingEntry = (index) => {
    const updated = toolPricingEntries.filter((_, i) => i !== index);
    setToolPricingEntries(updated);

    // Update formData
    const toolPricing = {};
    updated.forEach((entry) => {
      if (entry.name && entry.price) {
        toolPricing[entry.name] = parseFloat(entry.price);
      }
    });
    handleInputChange("pricing.toolPricing", toolPricing);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Prepare the data
      const submitData = { ...formData };

      // Convert string numbers to actual numbers
      submitData.pricing.defaultAmount = parseFloat(
        submitData.pricing.defaultAmount
      );

      // Map auth to the correct field name based on type
      if (submitData.type === "mcp_server") {
        submitData.mcpAuth = submitData.auth;
        delete submitData.auth;
      } else {
        // For AI models and APIs, we can use a generic auth field or map appropriately
        // Keep the auth structure for now
      }

      // No need to clean up llmConfig since we don't have it

      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/marketplace";
        }, 2000);
      } else {
        setError(data.error || "Failed to create resource");
      }
    } catch (error) {
      console.error("Error creating resource:", error);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "mcp_server":
        return <Server className="w-5 h-5" />;
      case "ai_model":
        return <Brain className="w-5 h-5" />;
      case "api":
        return <Database className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "mcp_server":
        return "from-blue-500 to-cyan-400";
      case "ai_model":
        return "from-purple-500 to-pink-400";
      case "api":
        return "from-emerald-500 to-teal-400";
      default:
        return "from-gray-500 to-gray-400";
    }
  };

  const getDocumentationPlaceholder = (type) => {
    if (type === "mcp_server") {
      return `## MCP Server Tools Guide

### Available Tools:
This server provides several tools for different tasks. Below are usage examples and best practices.

### Tool: search
Use this tool to search for information on any topic.

Example usage:
\`\`\`json
{
  "name": "search",
  "arguments": {
    "query": "how to create a token on Solana",
    "limit": 5
  }
}
\`\`\`

### Tool: web_scrape
Extract content from web pages.

Example usage:
\`\`\`json
{
  "name": "web_scrape", 
  "arguments": {
    "url": "https://example.com",
    "selector": "article"
  }
}
\`\`\`

### For AgentKit Integration:
Tell the agent any of these commands:
- "Pay and search for information about [topic]"
- "Pay and scrape content from [URL]" 
- "Pay and use the MCP server to [describe what you want]"

### Best Practices:
- Be specific in your search queries
- Use appropriate limits to avoid overwhelming responses
- Check tool schemas for all available parameters

### Notes:
- Tools are called using JSON-RPC format
- Most tools require payment except tools/list
- Rate limit: 100 calls per minute`;
    } else if (type === "api") {
      return `## How to use this API

### Example Request:
\`\`\`json
{
  "message": "Hello world",
  "timestamp": "2024-01-01T00:00:00Z"
}
\`\`\`

### Example Response:
\`\`\`json
{
  "status": "success",
  "response": "Message received!",
  "id": "12345"
}
\`\`\`

### Required Fields:
- \`message\` (string): The message to send
- \`timestamp\` (string, optional): ISO timestamp

### For AgentKit Integration:
To use with CDP AgentKit, tell the agent:
"Pay and make a POST request to this API with message field containing 'Hello from AgentKit'"

### Notes:
- All requests must be POST
- Content-Type: application/json
- Rate limit: 100 requests per minute`;
    } else {
      return `## AI Model Usage

### Example Request:
\`\`\`json
{
  "messages": [
    {"role": "user", "content": "Hello! How are you?"}
  ],
  "temperature": 0.7,
  "max_tokens": 150
}
\`\`\`

### Example Response:
\`\`\`json
{
  "choices": [
    {
      "message": {
        "role": "assistant", 
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      }
    }
  ],
  "usage": {
    "total_tokens": 45
  }
}
\`\`\`

### Required Fields:
- \`messages\` (array): Array of message objects with role and content
- \`temperature\` (number, optional): Controls randomness (0.0 to 1.0)
- \`max_tokens\` (number, optional): Maximum response length

### For AgentKit Integration:
To use with CDP AgentKit, tell the agent:
"Pay and ask the AI to respond to: [your question here]"

### Notes:
- Supports OpenAI-compatible format
- Default temperature: 0.7
- Default max_tokens: 1000`;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Resource Created!
          </h2>
          <p className="text-gray-600 mb-4">
            Your resource has been successfully added to the marketplace.
          </p>
          <p className="text-sm text-gray-500">Redirecting to marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => (window.location.href = "/marketplace")}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Marketplace
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                List New Resource
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Resource Type Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Resource Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  value: "mcp_server",
                  label: "MCP Server",
                  desc: "Model Context Protocol server with tools",
                },
                {
                  value: "ai_model",
                  label: "AI Model",
                  desc: "Any AI endpoint (OpenAI, Anthropic, custom, etc.)",
                },
                {
                  value: "api",
                  label: "Custom API",
                  desc: "Any API endpoint or service that you want to proxy",
                },
              ].map((type) => (
                <label key={type.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`border-2 rounded-xl p-4 transition-all ${
                      formData.type === type.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${getTypeColor(
                        type.value
                      )} rounded-lg flex items-center justify-center text-white mb-3`}
                    >
                      {getTypeIcon(type.value)}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{type.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {/* Basic Information */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Awesome API"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what your resource does and how it can be used..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Creator Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.creatorAddress}
                  onChange={(e) =>
                    handleInputChange("creatorAddress", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0x..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your wallet address where payments will be sent
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === "ai_model"
                    ? "AI Model Endpoint URL *"
                    : formData.type === "mcp_server"
                    ? "MCP Server URL *"
                    : "API Endpoint URL *"}
                </label>
                <input
                  type="url"
                  required
                  value={formData.originalUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    formData.type === "ai_model"
                      ? "https://api.openai.com/v1/chat/completions"
                      : formData.type === "mcp_server"
                      ? "https://your-mcp-server.com/mcp"
                      : "https://api.example.com/endpoint"
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === "ai_model"
                    ? "OpenAI, Anthropic, or any AI API endpoint"
                    : "The actual endpoint to be proxied"}
                </p>
              </div>
            </div>

            {/* MCP Tools Status */}
            {formData.type === "mcp_server" && formData.originalUrl && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {loadingTools ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600">
                          Fetching tools...
                        </span>
                      </>
                    ) : mcpTools.length > 0 ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-700 font-medium">
                          {mcpTools.length} tools found
                        </span>
                      </>
                    ) : toolsError ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          Failed to fetch tools
                        </span>
                      </>
                    ) : null}
                  </div>
                  {formData.originalUrl && (
                    <button
                      type="button"
                      onClick={() => fetchMCPTools(formData.originalUrl)}
                      className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Retry
                    </button>
                  )}
                </div>
                {toolsError && (
                  <p className="text-xs text-red-600 mt-2">{toolsError}</p>
                )}
                {mcpTools.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Available tools:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {mcpTools.slice(0, 6).map((tool, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-medium"
                        >
                          {tool.name}
                        </span>
                      ))}
                      {mcpTools.length > 6 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                          +{mcpTools.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Authentication Configuration - For ALL resource types */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Authentication (Optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Type
                </label>
                <select
                  value={formData.auth.type}
                  onChange={(e) =>
                    handleInputChange("auth.type", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">None (Public)</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                </select>
              </div>

              {formData.auth.type !== "none" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token/API Key
                    </label>
                    <input
                      type="password"
                      value={formData.auth.token}
                      onChange={(e) =>
                        handleInputChange("auth.token", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={
                        formData.type === "ai_model"
                          ? "sk-..."
                          : "Your auth token"
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.type === "ai_model" &&
                        "e.g., OpenAI API key, Anthropic API key, etc."}
                    </p>
                  </div>

                  {formData.auth.type === "api_key" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Header Name
                      </label>
                      <input
                        type="text"
                        value={formData.auth.header}
                        onChange={(e) =>
                          handleInputChange("auth.header", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="X-API-Key"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Pricing Configuration */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pricing Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Model
                </label>
                <select
                  value={formData.pricing.model}
                  onChange={(e) => handlePricingModelChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="per_call">Per Call</option>
                  {formData.type === "mcp_server" && (
                    <option value="per_tool">Per Tool</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Price (USDC) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="10"
                  required
                  value={formData.pricing.defaultAmount}
                  onChange={(e) =>
                    handleInputChange("pricing.defaultAmount", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Between 0.0001 and 10 USDC
                </p>
              </div>
            </div>

            {/* Tool-specific pricing for MCP servers */}
            {formData.type === "mcp_server" &&
              formData.pricing.model === "per_tool" && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Tool-specific Pricing
                    </label>
                    <button
                      type="button"
                      onClick={addToolPricingEntry}
                      className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Tool Price
                    </button>
                  </div>
                  <div className="space-y-3">
                    {toolPricingEntries.map((entry, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="text"
                          placeholder="Tool name"
                          value={entry.name}
                          onChange={(e) =>
                            updateToolPricingEntry(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          placeholder="Price"
                          value={entry.price}
                          onChange={(e) =>
                            updateToolPricingEntry(
                              index,
                              "price",
                              e.target.value
                            )
                          }
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeToolPricingEntry(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {mcpTools.length > 0 && toolPricingEntries.length === 0 && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        We found {mcpTools.length} tools. Click "Add Tool Price"
                        or switch pricing model to auto-populate.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>
          {/* Usage Instructions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Usage Instructions (Recommended)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {formData.type === "mcp_server"
                ? "Help users understand how to use your MCP server tools effectively. Include tool examples, best practices, and AgentKit instructions."
                : "Help users understand how to use your API. Include required fields, example requests, and AgentKit instructions."}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documentation (Markdown supported)
              </label>
              <textarea
                value={formData.documentation}
                onChange={(e) =>
                  handleInputChange("documentation", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                rows={12}
                placeholder={getDocumentationPlaceholder(formData.type)}
              />
              <p className="text-xs text-gray-500 mt-2">
                Use Markdown to format your documentation. This will help users
                understand how to integrate with your API.
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Resource"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListResource;
