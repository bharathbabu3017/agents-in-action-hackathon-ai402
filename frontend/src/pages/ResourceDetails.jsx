import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Copy,
  Check,
  ExternalLink,
  Server,
  Brain,
  Database,
  Zap,
  Star,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Eye,
  Code,
  Terminal,
  Wallet,
  Activity,
  Calendar,
  Hash,
  Loader,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

const ResourceDetails = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Add these new states for tool fetching
  const [mcpTools, setMcpTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState("");

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

  useEffect(() => {
    loadResource();
    loadTransactions();
  }, [id]);

  // Add this new useEffect to fetch tools when resource is loaded and it's an MCP server
  useEffect(() => {
    if (resource && resource.type === "mcp_server" && resource.proxyUrl) {
      loadMCPTools();
    }
  }, [resource]);

  // Add this new function to fetch MCP tools
  const loadMCPTools = async () => {
    if (!resource || resource.type !== "mcp_server" || !resource.proxyUrl)
      return;

    setLoadingTools(true);
    setToolsError("");
    setMcpTools([]);

    try {
      const response = await fetch(`${resource.proxyUrl}`, {
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

      if (response.ok) {
        const data = await response.json();
        // JSON-RPC response format: { jsonrpc, id, result: { tools: [...] } }
        const tools = data.result?.tools || [];
        setMcpTools(tools);
        console.log(`Loaded ${tools.length} tools from MCP server`);
      } else {
        console.error("Failed to fetch tools:", response.statusText);
        setToolsError(`Failed to fetch tools: ${response.statusText}`);
        setMcpTools([]);
      }
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      setToolsError(`Error fetching tools: ${error.message}`);
      setMcpTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const loadResource = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resources/${id}`);
      const data = await response.json();

      if (response.ok) {
        setResource(data);
      } else {
        setError(data.error || "Resource not found");
      }
    } catch (error) {
      console.error("Error loading resource:", error);
      setError("Failed to load resource");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/resources/${id}/transactions`
      );
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(""), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "mcp_server":
        return <Server className="w-6 h-6" />;
      case "ai_model":
        return <Brain className="w-6 h-6" />;
      case "api":
        return <Database className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
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

  const formatPrice = (pricing) => {
    if (!pricing) return "Free";

    const amount = pricing.defaultAmount;
    const currency = pricing.currency || "USDC";

    if (amount === 0) return "Free";

    if (
      pricing.model === "per_tool" &&
      pricing.toolPricing &&
      Object.keys(pricing.toolPricing).length > 0
    ) {
      return "Variable";
    }

    return `${amount} ${currency}`;
  };

  const getCurlExample = () => {
    if (!resource) return "";

    const headers = [
      `-H "Content-Type: application/json"`,
      `-H "Accept: application/json"`,
    ];

    let body = "";
    let description = "";

    if (resource.type === "mcp_server") {
      description = `# List available tools (free)
curl -X POST "${resource.proxyUrl}" \\
  ${headers.join(" \\\n  ")} \\
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}'

# Call a tool (requires payment)`;

      const paidHeaders = [
        ...headers,
        `-H "X-PAYMENT: <payment_proof_from_wallet>"`,
      ];

      body = `curl -X POST "${resource.proxyUrl}" \\
  ${paidHeaders.join(" \\\n  ")} \\
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {}
  }
}'`;
    } else if (resource.type === "ai_model") {
      description = "# Generate AI response (requires payment)";
      const paidHeaders = [
        ...headers,
        `-H "X-PAYMENT: <payment_proof_from_wallet>"`,
      ];

      body = `curl -X POST "${resource.proxyUrl}" \\
  ${paidHeaders.join(" \\\n  ")} \\
  -d '{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}'`;
    } else {
      description = "# Call API endpoint (requires payment)";
      const paidHeaders = [
        ...headers,
        `-H "X-PAYMENT: <payment_proof_from_wallet>"`,
      ];

      body = `curl -X POST "${resource.proxyUrl}" \\
  ${paidHeaders.join(" \\\n  ")} \\
  -d '{
  "your": "request",
  "data": "here"
}'`;
    }

    return `${description}
${body}

# Note: X-PAYMENT header contains cryptographic payment proof
# Use x402-axios or CDP AgentKit for automatic payment handling`;
  };

  const getx402AxiosExample = () => {
    if (!resource) return "";

    let requestBody = "";
    if (resource.type === "mcp_server") {
      requestBody = `{
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "tool_name",
    arguments: { /* tool arguments */ }
  }
}`;
    } else if (resource.type === "ai_model") {
      requestBody = `{
  messages: [
    { role: "user", content: "Hello!" }
  ],
  temperature: 0.7,
  max_tokens: 1000
}`;
    } else {
      requestBody = `{
  // Your API request data
}`;
    }

    return `import { withPaymentInterceptor } from 'x402-axios';
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';
import axios from 'axios';

// Create wallet client (browser wallet)
const walletClient = createWalletClient({
  account: "0x...", // Your wallet address
  transport: custom(window.ethereum),
  chain: baseSepolia,
});

// Create axios instance with payment interceptor
const api = withPaymentInterceptor(
  axios.create({
    baseURL: "${API_BASE_URL}",
  }),
  walletClient
);

// Make paid API call
try {
  const response = await api.post("${resource.proxyUrl.replace(
    API_BASE_URL,
    ""
  )}", ${requestBody});
  console.log(response.data);
} catch (error) {
  console.error('API call failed:', error);
}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading resource details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Resource Not Found
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Marketplace
              </button>
            </div>
            <div className="flex items-center space-x-3">
              {resource.type === "mcp_server" && (
                <button
                  onClick={() =>
                    (window.location.href = `/playground/${resource.id}`)
                  }
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Try in Playground
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resource Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div
                className={`w-20 h-20 bg-gradient-to-r ${getTypeColor(
                  resource.type
                )} rounded-2xl flex items-center justify-center text-white`}
              >
                {getTypeIcon(resource.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {resource.name}
                  </h1>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full border ${
                      resource.type === "mcp_server"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : resource.type === "ai_model"
                        ? "bg-purple-100 text-purple-800 border-purple-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {resource.type.replace("_", " ").toUpperCase()}
                  </span>
                  {resource.type === "ai_model" &&
                    resource.llmConfig?.provider === "bedrock" && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                        Powered by AWS Bedrock
                      </span>
                    )}
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  {resource.description}
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>{resource.starCount || 0} stars</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity className="w-4 h-4" />
                    <span>{resource.stats?.totalUses || 0} uses</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {resource.stats?.lastUsed
                        ? new Date(resource.stats.lastUsed).toLocaleDateString()
                        : "Never used"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatPrice(resource.pricing)}
              </div>
              <div className="text-sm text-gray-500">
                {resource.pricing?.model === "per_tool"
                  ? "per tool"
                  : "per call"}
              </div>
              <div className="text-lg font-semibold text-green-600 mt-2">
                {(resource.stats?.totalEarnings || 0).toFixed(3)} USDC earned
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "Overview", icon: Eye },
                ...(resource.type === "mcp_server"
                  ? [{ id: "tools", label: "Tools", icon: Zap }]
                  : []),
                { id: "integration", label: "Integration", icon: Code },
                { id: "transactions", label: "Transactions", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(resource.stats?.totalEarnings || 0).toFixed(3)} USDC
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Uses</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {resource.stats?.totalUses || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Unique Users</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {resource.stats?.uniqueUsers || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Resource Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Resource Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Category
                    </label>
                    <p className="text-gray-900 capitalize">
                      {resource.category}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Creator Address
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-gray-50 px-3 py-1 rounded border font-mono">
                        {resource.creatorAddress}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(resource.creatorAddress, "creator")
                        }
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copiedText === "creator" ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Proxy URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border font-mono overflow-x-auto whitespace-nowrap">
                        {resource.proxyUrl}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(resource.proxyUrl, "proxy")
                        }
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        {copiedText === "proxy" ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool-specific pricing or additional info */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pricing Details
                </h3>

                {resource.pricing?.model === "per_tool" &&
                resource.pricing?.toolPricing &&
                Object.keys(resource.pricing.toolPricing).length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">
                      Tool-specific pricing:
                    </p>
                    <div className="space-y-2">
                      {Object.entries(resource.pricing.toolPricing).map(
                        ([tool, price]) => (
                          <div
                            key={tool}
                            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                          >
                            <span className="text-gray-700 font-medium">
                              {tool}
                            </span>
                            <span className="text-gray-900">{price} USDC</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Base Price
                      </label>
                      <p className="text-2xl font-bold text-gray-900">
                        {resource.pricing?.defaultAmount || 0} USDC
                      </p>
                      <p className="text-sm text-gray-500">
                        {resource.pricing?.model === "per_tool"
                          ? "per tool call"
                          : "per API call"}
                      </p>
                    </div>
                    {resource.type === "ai_model" && resource.llmConfig && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Model Info
                        </label>
                        <p className="text-gray-900">
                          {resource.llmConfig.modelId}
                        </p>
                        <p className="text-sm text-gray-500">
                          Max tokens: {resource.llmConfig.defaultMaxTokens}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MCP Tools */}
            {resource.type === "mcp_server" &&
              resource.mcpTools &&
              resource.mcpTools.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Available Tools ({resource.mcpTools.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resource.mcpTools.map((tool, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-medium text-gray-900 mb-2">
                          {tool.name}
                        </h4>
                        {tool.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {tool.description}
                          </p>
                        )}
                        {tool.inputSchema?.properties && (
                          <div className="text-xs text-gray-500">
                            <p className="font-medium mb-1">Parameters:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.keys(tool.inputSchema.properties).map(
                                (param) => (
                                  <span
                                    key={param}
                                    className="bg-gray-100 px-2 py-1 rounded text-xs"
                                  >
                                    {param}
                                    {tool.inputSchema.required?.includes(
                                      param
                                    ) && (
                                      <span className="text-red-500">*</span>
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === "tools" && resource.type === "mcp_server" && (
          <div className="space-y-6">
            {/* Tools Header */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Available Tools
                  </h3>
                  <p className="text-gray-600">
                    {loadingTools
                      ? "Loading tools..."
                      : mcpTools.length > 0
                      ? `This MCP server provides ${mcpTools.length} tools`
                      : toolsError
                      ? toolsError
                      : "No tools are currently available for this MCP server"}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {loadingTools && (
                    <Loader className="w-5 h-5 animate-spin text-blue-500" />
                  )}
                  <button
                    onClick={loadMCPTools}
                    disabled={loadingTools}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${
                        loadingTools ? "animate-spin" : ""
                      }`}
                    />
                    Refresh Tools
                  </button>
                </div>
              </div>
            </div>

            {/* Error State */}
            {toolsError && !loadingTools && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h4 className="font-medium text-red-900">
                    Failed to Load Tools
                  </h4>
                </div>
                <p className="text-red-700 text-sm mb-3">{toolsError}</p>
                <button
                  onClick={loadMCPTools}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Tools Grid - Use fetched tools instead of resource.mcpTools */}
            {mcpTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mcpTools.map((tool, index) => {
                  // Get pricing for this tool
                  const getToolPrice = () => {
                    if (
                      resource.pricing?.model === "per_tool" &&
                      resource.pricing?.toolPricing &&
                      Object.keys(resource.pricing.toolPricing).length > 0
                    ) {
                      return (
                        resource.pricing.toolPricing[tool.name] ||
                        resource.pricing.defaultAmount
                      );
                    }
                    return resource.pricing?.defaultAmount || 0;
                  };

                  const toolPrice = getToolPrice();

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      {/* Tool Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {tool.name
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h4>
                          <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
                            {tool.name}
                          </code>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-green-600">
                            {toolPrice} USDC
                          </div>
                          <div className="text-xs text-gray-500">per call</div>
                        </div>
                      </div>

                      {/* Tool Description */}
                      {tool.description && (
                        <div className="mb-4">
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      )}

                      {/* Parameters */}
                      {tool.inputSchema?.properties &&
                        Object.keys(tool.inputSchema.properties).length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-3">
                              Parameters
                            </h5>
                            <div className="space-y-2">
                              {Object.entries(tool.inputSchema.properties).map(
                                ([paramName, paramInfo]) => (
                                  <div
                                    key={paramName}
                                    className="bg-gray-50 rounded-lg p-3"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <code className="text-sm font-medium text-gray-800">
                                        {paramName}
                                        {tool.inputSchema.required?.includes(
                                          paramName
                                        ) && (
                                          <span className="text-red-500 ml-1">
                                            *
                                          </span>
                                        )}
                                      </code>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                        {paramInfo.type || "any"}
                                      </span>
                                    </div>
                                    {paramInfo.description && (
                                      <p className="text-xs text-gray-600 mt-1">
                                        {paramInfo.description}
                                      </p>
                                    )}
                                    {paramInfo.enum && (
                                      <div className="mt-2">
                                        <span className="text-xs text-gray-500">
                                          Options:{" "}
                                        </span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {paramInfo.enum.map((option, i) => (
                                            <span
                                              key={i}
                                              className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded"
                                            >
                                              {option}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                            {tool.inputSchema.required &&
                              tool.inputSchema.required.length > 0 && (
                                <p className="text-xs text-gray-500 mt-3">
                                  <span className="text-red-500">*</span>{" "}
                                  Required parameters
                                </p>
                              )}
                          </div>
                        )}

                      {/* No Parameters */}
                      {(!tool.inputSchema?.properties ||
                        Object.keys(tool.inputSchema.properties).length ===
                          0) && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-sm text-gray-500">
                            No parameters required
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !loadingTools && !toolsError ? (
              // No Tools State (only show if not loading and no error)
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Tools Available
                </h3>
                <p className="text-gray-500 mb-4 max-w-md mx-auto">
                  This MCP server doesn't have any tools available or they
                  couldn't be loaded from the server.
                </p>
                <button
                  onClick={loadMCPTools}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Try Loading Tools Again
                </button>
              </div>
            ) : null}

            {/* Pricing Summary - Update to use fetched tools count */}
            {mcpTools.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pricing Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {resource.pricing?.model === "per_tool"
                        ? "Variable"
                        : `${resource.pricing?.defaultAmount || 0} USDC`}
                    </div>
                    <div className="text-sm text-gray-500">Base Price</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {mcpTools.length}
                    </div>
                    <div className="text-sm text-gray-500">Available Tools</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {resource.pricing?.model === "per_tool" &&
                      resource.pricing?.toolPricing &&
                      Object.keys(resource.pricing.toolPricing).length > 0
                        ? `${Math.min(
                            ...Object.values(resource.pricing.toolPricing)
                          )} - ${Math.max(
                            ...Object.values(resource.pricing.toolPricing)
                          )}`
                        : resource.pricing?.defaultAmount || 0}{" "}
                      USDC
                    </div>
                    <div className="text-sm text-gray-500">
                      {resource.pricing?.model === "per_tool"
                        ? "Price Range"
                        : "Per Tool"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "integration" && (
          <div className="space-y-8">
            {/* Integration Options */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                How to Use This Resource
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {resource.type === "mcp_server" && (
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <Play className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">
                        Playground
                      </h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Try the tools interactively with our chat interface.
                    </p>
                    <button
                      onClick={() =>
                        (window.location.href = `/playground/${resource.id}`)
                      }
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Open Playground →
                    </button>
                  </div>
                )}

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Code className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">
                      x402-axios
                    </h4>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Integrate with automatic crypto payments in your app.
                  </p>
                </div>

                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Wallet className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-900">
                      CDP AgentKit
                    </h4>
                  </div>
                  <p className="text-sm text-orange-700 mb-3">
                    AI agents can autonomously pay for and use this resource
                    with x402 actions.
                  </p>
                </div>

                <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Terminal className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-semibold text-emerald-900">
                      Direct API
                    </h4>
                  </div>
                  <p className="text-sm text-emerald-700 mb-3">
                    Call the API directly with curl or any HTTP client.
                  </p>
                </div>
              </div>
            </div>

            {/* Code Examples - Only cURL and x402-axios */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Terminal className="w-5 h-5 mr-2" />
                      cURL Example
                    </h4>
                    <button
                      onClick={() => copyToClipboard(getCurlExample(), "curl")}
                      className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                    >
                      {copiedText === "curl" ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-sm">Copy</span>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    <code>{getCurlExample()}</code>
                  </pre>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Code className="w-5 h-5 mr-2" />
                      x402-axios Integration
                    </h4>
                    <button
                      onClick={() =>
                        copyToClipboard(getx402AxiosExample(), "x402")
                      }
                      className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                    >
                      {copiedText === "x402" ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-sm">Copy</span>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    <code>{getx402AxiosExample()}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Transaction History
              </h3>
            </div>
            <div className="overflow-x-auto">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                  <p className="text-sm text-gray-400">
                    Transactions will appear here once users start using this
                    resource
                  </p>
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tool/Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {tx.fromAddress.slice(0, 6)}...
                                {tx.fromAddress.slice(-4)}
                              </code>
                              <div className="text-xs text-gray-500">Payer</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">
                            {tx.toolUsed || "API Call"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {resource.type === "mcp_server"
                              ? "Tool execution"
                              : resource.type === "ai_model"
                              ? "AI inference"
                              : "API call"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-600">
                            {tx.amount} {tx.currency}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${(tx.amount * 1).toFixed(3)} USD
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tx.blockNumber ? (
                            <div>
                              <a
                                href={`https://base-sepolia.blockscout.com/block/${tx.blockNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 font-mono"
                              >
                                #{tx.blockNumber}
                              </a>
                              {tx.gasUsed && (
                                <div className="text-xs text-gray-400">
                                  Gas: {tx.gasUsed}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.txHash ? (
                            <div>
                              <a
                                href={`https://base-sepolia.blockscout.com/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                <code className="text-xs">
                                  {tx.txHash.slice(0, 8)}...
                                  {tx.txHash.slice(-6)}
                                </code>
                              </a>
                              <button
                                onClick={() =>
                                  copyToClipboard(tx.txHash, `tx-${tx._id}`)
                                }
                                className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                              >
                                {copiedText === `tx-${tx._id}`
                                  ? "Copied!"
                                  : "Copy hash"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">No hash</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tx.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : tx.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tx.status === "completed" && (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            {tx.status === "pending" && (
                              <Clock className="w-3 h-3 mr-1" />
                            )}
                            {tx.status === "failed" && (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceDetails;
