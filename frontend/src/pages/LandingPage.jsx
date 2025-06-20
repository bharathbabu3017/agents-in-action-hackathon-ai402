import React, { useState } from "react";
import {
  ArrowRight,
  Code,
  Play,
  Bot,
  Wallet,
  Zap,
  Globe,
  Shield,
  Coins,
  ChevronDown,
  ExternalLink,
  Star,
  Users,
  TrendingUp,
  Server,
  Brain,
  Database,
  ShoppingBag,
  Plus,
  Search,
  Link,
  CheckCircle,
} from "lucide-react";

const LandingPage = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const monetizationOptions = [
    {
      icon: <Server className="w-12 h-12" />,
      title: "MCP Servers",
      description:
        "Turn your Model Context Protocol servers into revenue streams with live tool fetching",
      example: "Weather APIs, Data Processing, File Operations, Web Scraping",
      earnings: "Earn per tool call",
      color: "from-blue-500 to-cyan-400",
    },
    {
      icon: <Brain className="w-12 h-12" />,
      title: "AI Models",
      description:
        "Monetize access to your custom AI models and inference endpoints with AWS Bedrock integration",
      example: "Fine-tuned Models, Specialized LLMs, Claude/GPT wrappers",
      earnings: "Earn per inference",
      color: "from-purple-500 to-pink-400",
    },
    {
      icon: <Database className="w-12 h-12" />,
      title: "Any API/Service",
      description:
        "Transform any existing API, microservice, or digital endpoint into a monetized service - no code changes needed",
      example:
        "REST APIs, GraphQL endpoints, Webhooks, Data services, SaaS APIs",
      earnings: "Earn per usage",
      color: "from-emerald-500 to-teal-400",
    },
  ];

  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "Direct API Integration",
      description:
        "Developers integrate your monetized endpoints directly with x402-axios for seamless payment handling",
      highlight:
        "No code changes needed to your API, just provide your endpoint URL",
      color: "border-blue-200 bg-blue-50",
    },
    {
      icon: <Play className="w-8 h-8" />,
      title: "Interactive Playground",
      description:
        "Users try your MCP tools through our chat interface with live tool discovery - no technical setup required",
      highlight: "Pay for MCP tool usage seamlessly with your wallet",
      color: "border-purple-200 bg-purple-50",
    },
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Autonomous Agent Access",
      description:
        "AI agents discover and pay for your services automatically using CDP AgentKit with x402 integration",
      highlight: "AI agents can pay for your services automatically",
      color: "border-emerald-200 bg-emerald-50",
    },
  ];

  const cryptoAdvantages = [
    {
      title: "Global Payments",
      description:
        "Accept payments from anywhere without banking restrictions using Base Sepolia",
      icon: <Globe className="w-6 h-6" />,
      color: "bg-blue-500",
    },
    {
      title: "Micro-transactions",
      description:
        "Enable payments as low as $0.001 USDC - impossible with traditional rails",
      icon: <Coins className="w-6 h-6" />,
      color: "bg-emerald-500",
    },
    {
      title: "Instant Settlement",
      description: "Receive payments immediately in your CDP wallet, no delays",
      icon: <Zap className="w-6 h-6" />,
      color: "bg-amber-500",
    },
    {
      title: "Programmable Money",
      description:
        "Smart contracts and agents can pay automatically via x402 protocol",
      icon: <Bot className="w-6 h-6" />,
      color: "bg-purple-500",
    },
  ];

  const faqs = [
    {
      q: "What exactly can I monetize on this platform?",
      a: "Any digital service with an API: MCP servers with live tool discovery, AI models (including AWS Bedrock), existing REST/GraphQL APIs, microservices, webhooks, or any HTTP endpoint. We create a proxy layer that handles x402 payments while forwarding requests to your original service - no code changes needed on your end.",
    },
    {
      q: "How does the MCP server integration work?",
      a: "Simply provide your MCP server URL when listing a resource. Our platform automatically discovers and displays your tools using the JSON-RPC 'tools/list' method. Users can try your tools in our playground with free LLM access, or developers can integrate directly via API with x402 payments.",
    },
    {
      q: "How do x402 payments work for API calls?",
      a: "When someone calls your API, they get a 402 Payment Required response with the cost in USDC. They pay on Base Sepolia, get a cryptographic payment proof, and retry the request with the X-PAYMENT header. Payment goes directly to your specified wallet address instantly. We support x402-axios and CDP AgentKit for seamless integration.",
    },
    {
      q: "Do I need to handle payments or modify my existing API?",
      a: "No. Our platform creates a proxy layer that handles all payment processing, crypto conversions, and routing. Your original API remains unchanged. You just provide your endpoint URL, set your price per call (or per tool for MCP servers), and specify your wallet address. We handle the rest including live tool discovery for MCP servers.",
    },
    {
      q: "What's the difference between the playground and direct API access?",
      a: "The playground lets users chat with AI models (free via AWS Bedrock) and pay only when they use your tools - perfect for discovery and testing. Direct API access is for developers who want to integrate your endpoints into their applications with automatic x402 payments via x402-axios or CDP AgentKit.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">AI402</span>
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                Platform
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => (window.location.href = "/marketplace")}
                className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Browse Marketplace
              </button>
              <button
                onClick={() => (window.location.href = "/playground")}
                className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Try Playground
              </button>
              <button
                onClick={() => (window.location.href = "/list-resource")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
              >
                Start Monetizing
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-blue-200">
              <Coins className="w-4 h-4" />
              <span>x402 Protocol API Monetization Platform</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Monetize Your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MCP Servers & AI Models
              </span>
              <span className="block text-gray-800">With x402 Payments</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-10">
              Monetize your MCP servers, AI models, or any API with crypto
              payments. Powered by x402 protocol, accept USDC payments on Base
              Sepolia instantly. Live tool discovery, interactive playground,
              and AWS Bedrock integration.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => (window.location.href = "/playground")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center shadow-lg"
              >
                <Play className="mr-2 w-5 h-5" />
                Try Live Playground
              </button>
              <button
                onClick={() => (window.location.href = "/marketplace")}
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center"
              >
                <ShoppingBag className="mr-2 w-5 h-5" />
                Browse Marketplace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works - Proxy URLs */}
      <div className="bg-white py-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Payment-Gated URLs For Your Resources
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simply provide your API endpoint - we generate a monetized URL
              that requires payment before access
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Main Flow Diagram */}
            <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12 border border-gray-200 overflow-hidden">
              {/* Background Animation Elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-100 rounded-full opacity-20 animate-pulse"></div>
                <div
                  className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-100 rounded-full opacity-20 animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                <div
                  className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-100 rounded-full opacity-20 animate-pulse"
                  style={{ animationDelay: "2s" }}
                ></div>
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
                {/* Left Side - Users/Agents */}
                <div className="text-center lg:text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Users & AI Agents
                  </h3>
                  <div className="space-y-4">
                    {/* AI Agent */}
                    <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            AI Agents
                          </div>
                          <div className="text-sm text-gray-600">
                            CDP AgentKit
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LLM Apps */}
                    <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            LLM Apps
                          </div>
                          <div className="text-sm text-gray-600">
                            Playground Users
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Developers */}
                    <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Code className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            Developers
                          </div>
                          <div className="text-sm text-gray-600">
                            x402-axios
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center - AI402 Proxy */}
                <div className="relative">
                  {/* Animated Arrows In */}
                  <div className="hidden lg:block absolute -left-8 top-1/2 transform -translate-y-1/2">
                    <div className="flex items-center space-x-2 text-blue-500 animate-pulse">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                      <div
                        className="w-3 h-3 bg-blue-500 rounded-full animate-ping"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-3 h-3 bg-blue-500 rounded-full animate-ping"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Animated Arrows Out */}
                  <div className="hidden lg:block absolute -right-8 top-1/2 transform -translate-y-1/2">
                    <div className="flex items-center space-x-2 text-green-500 animate-pulse">
                      <ArrowRight className="w-6 h-6" />
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                      <div
                        className="w-3 h-3 bg-green-500 rounded-full animate-ping"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-3 h-3 bg-green-500 rounded-full animate-ping"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>

                  {/* Main Proxy Box */}
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white text-center shadow-2xl transform hover:scale-105 transition-all">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">AI402 x402 Proxy</h3>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-4">
                      <code className="text-sm break-all">
                        ai402-proxy.xyz/your-resource
                      </code>
                    </div>
                    <div className="text-sm space-y-1 opacity-90">
                      <div>✓ Payment Verification</div>
                      <div>✓ USDC Settlement</div>
                      <div>✓ Request Forwarding</div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Your Resources */}
                <div className="text-center lg:text-right">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Your Resources
                  </h3>
                  <div className="space-y-4">
                    {/* MCP Server */}
                    <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3 lg:flex-row-reverse lg:space-x-reverse">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Server className="w-5 h-5 text-white" />
                        </div>
                        <div className="lg:text-right">
                          <div className="font-semibold text-gray-900">
                            MCP Server
                          </div>
                          <div className="text-sm text-gray-600">
                            Weather, Files, Data
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Model */}
                    <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3 lg:flex-row-reverse lg:space-x-reverse">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div className="lg:text-right">
                          <div className="font-semibold text-gray-900">
                            AI Model
                          </div>
                          <div className="text-sm text-gray-600">
                            Custom LLMs
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* API Service */}
                    <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3 lg:flex-row-reverse lg:space-x-reverse">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <div className="lg:text-right">
                          <div className="font-semibold text-gray-900">
                            Any API
                          </div>
                          <div className="text-sm text-gray-600">
                            REST, GraphQL
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Arrows */}
              <div className="lg:hidden flex justify-center my-8 space-x-4">
                <div className="flex flex-col items-center space-y-2 text-blue-500">
                  <div className="w-6 h-6 border-2 border-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <ArrowRight className="w-6 h-6 transform rotate-90" />
                </div>
                <div className="flex flex-col items-center space-y-2 text-green-500">
                  <ArrowRight className="w-6 h-6 transform rotate-90" />
                  <div className="w-6 h-6 border-2 border-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Bottom Info Box */}
              <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Wallet className="w-5 h-5 mr-2 text-blue-600" />
                      For Users & Agents
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Pay with USDC on Base Sepolia</li>
                      <li>• Automatic x402 payment handling</li>
                      <li>• Instant access to tools and APIs</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Coins className="w-5 h-5 mr-2 text-green-600" />
                      For Resource Owners
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Instant USDC payments to your wallet</li>
                      <li>• No code changes to your API</li>
                      <li>• Live tool discovery for MCP servers</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* See It In Action Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              See It In Action
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our live marketplace, try the interactive playground, or
              list your own resource
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center space-x-3 mb-4">
                <ShoppingBag className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Browse Marketplace
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Explore MCP servers, AI models, and APIs. See live tool
                discovery, pricing, and usage statistics.
              </p>
              <button
                onClick={() => (window.location.href = "/marketplace")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium w-full justify-center"
              >
                <Search className="w-4 h-4 mr-2" />
                Browse Resources
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="flex items-center space-x-3 mb-4">
                <Play className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Try Playground
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Chat with AI models (free) and try MCP tools (pay per use).
                Perfect for testing and discovery.
              </p>
              <button
                onClick={() => (window.location.href = "/playground")}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center font-medium w-full justify-center"
              >
                <Bot className="w-4 h-4 mr-2" />
                Try Playground
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="flex items-center space-x-3 mb-4">
                <Plus className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  List Your Resource
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Add your MCP server, AI model, or API to start monetizing. Set
                your price and earn USDC instantly.
              </p>
              <button
                onClick={() => (window.location.href = "/list-resource")}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center font-medium w-full justify-center"
              >
                <Link className="w-4 h-4 mr-2" />
                List Resource
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* x402 Payment Benefits */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Why x402 Payments for APIs?
            </h2>
            <p className="text-gray-300 text-xl max-w-2xl mx-auto">
              Traditional payment rails weren't built for the AI economy. x402
              protocol unlocks new possibilities with Base Sepolia and USDC.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {cryptoAdvantages.map((advantage, index) => (
              <div key={index} className="text-center group">
                <div
                  className={`${advantage.color} w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  {advantage.icon}
                </div>
                <h3 className="font-bold text-xl mb-3">{advantage.title}</h3>
                <p className="text-gray-300 leading-relaxed">
                  {advantage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What You Can Monetize */}
      <div id="monetize" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What Can You Monetize?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Any digital service or API can be gated with x402 payments. We
              provide live tool discovery for MCP servers and seamless proxy
              integration for any existing API.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {monetizationOptions.map((option, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all shadow-lg hover:shadow-xl group"
              >
                <div
                  className={`bg-gradient-to-r ${option.color} w-20 h-20 rounded-2xl flex items-center justify-center mb-8 text-white group-hover:scale-110 transition-transform`}
                >
                  {option.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {option.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {option.description}
                </p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                  <p className="text-sm text-gray-500 mb-2 font-medium">
                    Examples:
                  </p>
                  <p className="text-gray-700 font-medium">{option.example}</p>
                </div>
                <div
                  className={`inline-flex items-center bg-gradient-to-r ${option.color} bg-clip-text text-transparent font-bold`}
                >
                  <Coins className="w-4 h-4 mr-2 text-gray-400" />
                  {option.earnings}
                </div>
              </div>
            ))}
          </div>

          {/* CTA to list resource */}
          <div className="text-center mt-16">
            <button
              onClick={() => (window.location.href = "/list-resource")}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center mx-auto shadow-lg"
            >
              <Plus className="mr-2 w-5 h-5" />
              List Your Resource Now
            </button>
          </div>
        </div>
      </div>

      {/* Three Access Methods */}
      <div
        id="features"
        className="py-24 bg-gradient-to-br from-gray-50 to-blue-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Three Ways to Access Your Monetized APIs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're serving developers, end users, or autonomous agents
              - we provide the right interface with live tool discovery and x402
              integration.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${feature.color} rounded-2xl p-8 border-2 hover:shadow-xl transition-all group`}
              >
                <div className="text-gray-600 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                {feature.highlight && (
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white text-sm font-medium rounded-lg px-4 py-3 shadow-lg">
                    ✓ {feature.highlight}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-gradient-to-r from-gray-100 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm mb-12 font-medium">
            Built on enterprise-grade infrastructure
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-4 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold">AWS</span>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">Amazon Bedrock</div>
                <div className="text-sm text-gray-500">
                  Free AI Model Access
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold">CB</span>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">Coinbase CDP</div>
                <div className="text-sm text-gray-500">
                  Wallet & Base Sepolia
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-sm">x402</span>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">x402 Protocol</div>
                <div className="text-sm text-gray-500">
                  Payment Infrastructure
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple setup, live tool discovery, immediate revenue
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "List Your Resource",
                desc: "Add your MCP server, AI model, or any existing API endpoint. We automatically discover and display your tools.",
                color: "from-blue-500 to-cyan-400",
              },
              {
                step: "2",
                title: "Set Your Price",
                desc: "Define pricing per call or per tool. You control the economics and payment destination wallet.",
                color: "from-purple-500 to-pink-400",
              },
              {
                step: "3",
                title: "Users Discover & Pay",
                desc: "Users find your tools in our marketplace and playground, pay instantly with USDC on Base Sepolia via x402.",
                color: "from-emerald-500 to-teal-400",
              },
              {
                step: "4",
                title: "Receive Payments",
                desc: "x402 payments flow directly to your specified wallet address in real-time. Monitor usage and earnings.",
                color: "from-amber-500 to-orange-400",
              },
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div
                  className={`w-20 h-20 bg-gradient-to-r ${item.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-8 text-2xl font-bold group-hover:scale-110 transition-transform shadow-lg`}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <button
                  className="w-full text-left p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">
            Start Monetizing Your AI Tools Today
          </h2>
          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            Join the x402-powered AI economy. Turn your MCP servers, AI models,
            and any existing APIs into revenue streams with global reach and
            live tool discovery.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => (window.location.href = "/list-resource")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              List Your Resource
            </button>
            <button
              onClick={() => (window.location.href = "/marketplace")}
              className="border-2 border-gray-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center"
            >
              <ShoppingBag className="mr-2 w-5 h-5" />
              Explore Marketplace
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between border-b border-gray-800 pb-8 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                AI402 Platform
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <button
                onClick={() => (window.location.href = "/marketplace")}
                className="hover:text-white transition-colors"
              >
                Marketplace
              </button>
              <button
                onClick={() => (window.location.href = "/playground")}
                className="hover:text-white transition-colors"
              >
                Playground
              </button>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            © 2025 AI402 Platform. Monetize your MCP servers, AI models, and
            APIs with x402 payments.
          </div>
          <div className="text-center text-sm text-gray-500">
            Built with ❤️ by{" "}
            <a
              href="https://twitter.com/bharathbabu3017"
              target="_blank"
              rel="noopener noreferrer"
            >
              @bharathbabu3017
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
