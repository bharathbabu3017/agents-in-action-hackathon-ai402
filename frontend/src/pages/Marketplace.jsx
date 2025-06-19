import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Star,
  Play,
  Server,
  Brain,
  Database,
  ExternalLink,
  Zap,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Copy,
  Check,
  ArrowRight,
  Loader,
  Plus,
} from "lucide-react";

const Marketplace = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [starringResource, setStarringResource] = useState(null);

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

  useEffect(() => {
    loadResources();
  }, [selectedType, selectedCategory]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== "all") params.append("type", selectedType);
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);

      const url = `${API_BASE_URL}/api/resources${
        params.toString() ? `?${params}` : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setResources(data);
      } else {
        console.error("Failed to load resources:", data);
        setResources([]);
      }
    } catch (error) {
      console.error("Error loading resources:", error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async (resourceId) => {
    try {
      setStarringResource(resourceId);
      const response = await fetch(
        `${API_BASE_URL}/api/resources/${resourceId}/star`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update the star count in the local state
        setResources((prev) =>
          prev.map((resource) =>
            resource.id === resourceId
              ? { ...resource, starCount: (resource.starCount || 0) + 1 }
              : resource
          )
        );
      }
    } catch (error) {
      console.error("Error starring resource:", error);
    } finally {
      setStarringResource(null);
    }
  };

  const copyProxyUrl = async (url, resourceId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(resourceId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
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

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case "mcp_server":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ai_model":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "api":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatPrice = (pricing) => {
    if (!pricing) return "Free";

    const amount = pricing.defaultAmount;
    const currency = pricing.currency || "USDC";

    if (amount === 0) return "Free";

    // Check if there's variable pricing per tool
    if (
      pricing.model === "per_tool" &&
      pricing.toolPricing &&
      Object.keys(pricing.toolPricing).length > 0
    ) {
      return "Variable";
    }

    // Just show the actual amount without $ sign
    return `${amount} ${currency}`;
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const resourceTypes = [
    { value: "all", label: "All Types", count: resources.length },
    {
      value: "mcp_server",
      label: "MCP Servers",
      count: resources.filter((r) => r.type === "mcp_server").length,
    },
    {
      value: "ai_model",
      label: "AI Models",
      count: resources.filter((r) => r.type === "ai_model").length,
    },
    {
      value: "api",
      label: "APIs",
      count: resources.filter((r) => r.type === "api").length,
    },
  ];

  const categories = [
    "all",
    ...new Set(resources.map((r) => r.category).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading marketplace...</p>
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
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI402 Marketplace
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => (window.location.href = "/list-resource")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                List New Resource
              </button>
              <button
                onClick={() => (window.location.href = "/playground")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Try Playground
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all"
                        ? "All Categories"
                        : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {resourceTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  selectedType === type.value
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <span>{type.label}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    selectedType === type.value
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {type.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Resources</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resources.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">MCP Servers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resources.filter((r) => r.type === "mcp_server").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">AI Models</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resources.filter((r) => r.type === "ai_model").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Custom APIs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resources.filter((r) => r.type === "api").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No resources found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-lg group"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${getTypeColor(
                        resource.type
                      )} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
                    >
                      {getTypeIcon(resource.type)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeBadgeColor(
                          resource.type
                        )}`}
                      >
                        {resource.type.replace("_", " ").toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleStar(resource.id)}
                        disabled={starringResource === resource.id}
                        className="flex items-center space-x-1 text-gray-500 hover:text-yellow-500 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            starringResource === resource.id
                              ? "animate-pulse"
                              : ""
                          }`}
                        />
                        <span className="text-sm">
                          {resource.starCount || 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {resource.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    {resource.description}
                  </p>

                  {/* Add AWS Bedrock badge only for Bedrock models */}
                  {resource.type === "ai_model" &&
                    resource.llmConfig?.provider === "bedrock" && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                          Powered by AWS Bedrock
                        </span>
                      </div>
                    )}
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Proxy URL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Proxy URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-xs bg-gray-50 px-3 py-2 rounded-lg border font-mono text-gray-700 overflow-x-auto whitespace-nowrap">
                        {resource.proxyUrl}
                      </code>
                      <button
                        onClick={() =>
                          copyProxyUrl(resource.proxyUrl, resource.id)
                        }
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      >
                        {copiedUrl === resource.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stats Row - Reduced font size */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatPrice(resource.pricing)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {resource.pricing?.model === "per_tool"
                          ? resource.pricing?.toolPricing &&
                            Object.keys(resource.pricing.toolPricing).length > 0
                            ? "varies per tool"
                            : "per tool"
                          : "per call"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {resource.stats?.totalUses || 0}
                      </div>
                      <div className="text-xs text-gray-500">uses</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {(resource.stats?.totalEarnings || 0).toFixed(3)} USDC
                      </div>
                      <div className="text-xs text-gray-500">earned</div>
                    </div>
                  </div>

                  {/* MCP Tools Preview */}
                  {resource.type === "mcp_server" &&
                    resource.mcpTools &&
                    resource.mcpTools.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Available Tools ({resource.mcpTools.length})
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {resource.mcpTools.slice(0, 3).map((tool, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-medium"
                            >
                              {tool.name}
                            </span>
                          ))}
                          {resource.mcpTools.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                              +{resource.mcpTools.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Card Footer */}
                <div className="p-6 pt-0 flex space-x-3">
                  {resource.type === "mcp_server" && (
                    <button
                      onClick={() =>
                        (window.location.href = `/playground/${resource.id}`)
                      }
                      className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1.5 text-sm font-medium"
                    >
                      <Play className="w-3 h-3" />
                      <span>Try in Playground</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      (window.location.href = `/resource/${resource.id}`)
                    }
                    className={`${
                      resource.type === "mcp_server" ? "flex-1" : "w-full"
                    } border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1.5 text-sm font-medium`}
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
