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
} from "lucide-react";

const LandingPage = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const monetizationOptions = [
    {
      icon: <Server className="w-12 h-12" />,
      title: "MCP Servers",
      description:
        "Turn your Model Context Protocol servers into revenue streams",
      example: "Weather APIs, Data Processing, File Operations",
      earnings: "Earn per API call",
      color: "from-blue-500 to-cyan-400",
    },
    {
      icon: <Brain className="w-12 h-12" />,
      title: "AI Models",
      description:
        "Monetize access to your custom AI models and inference endpoints",
      example: "Fine-tuned Models, Specialized LLMs, Computer Vision",
      earnings: "Earn per inference",
      color: "from-purple-500 to-pink-400",
    },
    {
      icon: <Database className="w-12 h-12" />,
      title: "Any API/Service",
      description:
        "Gatekeeper any digital service or API endpoint with crypto payments",
      example: "Data APIs, Microservices, Digital Content",
      earnings: "Earn per usage",
      color: "from-emerald-500 to-teal-400",
    },
  ];

  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "Direct API Integration",
      description:
        "Developers integrate your monetized endpoints directly into their applications",
      code: "curl ai402proxy.xyz/your-api -H 'x-payment: crypto-proof'",
      color: "border-blue-200 bg-blue-50",
    },
    {
      icon: <Play className="w-8 h-8" />,
      title: "No-Code Playground",
      description:
        "Users try your tools through our chat interface - no technical setup required",
      highlight: "Free LLM access, pay only for your tools",
      color: "border-purple-200 bg-purple-50",
    },
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Autonomous Agent Access",
      description:
        "AI agents discover and pay for your services automatically using CDP AgentKit",
      highlight: "Self-operating economic agents",
      color: "border-emerald-200 bg-emerald-50",
    },
  ];

  const cryptoAdvantages = [
    {
      title: "Global Payments",
      description: "Accept payments from anywhere without banking restrictions",
      icon: <Globe className="w-6 h-6" />,
      color: "bg-blue-500",
    },
    {
      title: "Micro-transactions",
      description:
        "Enable payments as low as $0.001 - impossible with traditional rails",
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
      description: "Smart contracts and agents can pay automatically",
      icon: <Bot className="w-6 h-6" />,
      color: "bg-purple-500",
    },
  ];

  const faqs = [
    {
      q: "What exactly can I monetize on this platform?",
      a: "Any digital service with an API: MCP servers, AI models, data APIs, microservices, or custom endpoints. If it can be called programmatically, it can be monetized with crypto payments.",
    },
    {
      q: "How does crypto payment work for API calls?",
      a: "When someone calls your API, they get a 402 Payment Required response showing the cost. They pay with USDC on Base, get a payment proof, and retry the request. Payment goes directly to your CDP wallet instantly.",
    },
    {
      q: "Why use crypto instead of credit cards?",
      a: "Crypto enables global access, micro-payments under $0.01, instant settlements, and programmable payments by AI agents - none of which traditional payment rails can handle efficiently.",
    },
    {
      q: "Do I need to handle payments or crypto?",
      a: "No. Our platform handles all payment processing, crypto conversions, and routing. You just provide your API endpoint and set your price per call.",
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
              <a
                href="#monetize"
                className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                What You Can Monetize
              </a>
              <a
                href="#playground"
                className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Playground
              </a>
              <a
                href="#docs"
                className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Documentation
              </a>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg">
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
              <span>Crypto-Native API Monetization</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Monetize Your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MCP Servers & AI Models
              </span>
              <span className="block text-gray-800">With Crypto Payments</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-10">
              The first platform to enable seamless cryptocurrency payments for
              AI tools, MCP servers, and APIs. Accept global payments, enable
              micro-transactions, and serve autonomous agents.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center shadow-lg">
                <Play className="mr-2 w-5 h-5" />
                Try Live Playground
              </button>
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center">
                <Code className="mr-2 w-5 h-5" />
                View Integration Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crypto Payment Benefits */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Why Crypto Payments for APIs?
            </h2>
            <p className="text-gray-300 text-xl max-w-2xl mx-auto">
              Traditional payment rails weren't built for the AI economy. Crypto
              unlocks new possibilities.
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
              Any digital service or API can be gated with crypto payments. Here
              are the most popular use cases.
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
        </div>
      </div>

      {/* Powered By Infrastructure */}
      <div className="bg-gradient-to-r from-gray-100 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm mb-12 font-medium">
            Built on enterprise-grade infrastructure
          </p>
          <div className="flex items-center justify-center space-x-16">
            <div className="flex items-center space-x-4 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold">AWS</span>
              </div>
              <div>
                <div className="font-bold text-gray-800">Amazon Bedrock</div>
                <div className="text-sm text-gray-500">
                  AI Model Infrastructure
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold">CB</span>
              </div>
              <div>
                <div className="font-bold text-gray-800">Coinbase CDP</div>
                <div className="text-sm text-gray-500">Wallet & Payments</div>
              </div>
            </div>
            <div className="flex items-center space-x-4 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-white font-bold text-sm">x402</span>
              </div>
              <div>
                <div className="font-bold text-gray-800">x402 Protocol</div>
                <div className="text-sm text-gray-500">
                  Payment Infrastructure
                </div>
              </div>
            </div>
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
              - we provide the right interface.
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
                {feature.code && (
                  <div className="bg-gray-800 rounded-lg p-4 text-sm text-green-400 font-mono overflow-x-auto shadow-inner">
                    {feature.code}
                  </div>
                )}
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

      {/* Real-time Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="text-blue-100 font-medium text-lg">
                Access Methods
              </div>
              <div className="text-sm text-blue-200 mt-2">
                API • Playground • Agents
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform">
                $0.001
              </div>
              <div className="text-blue-100 font-medium text-lg">
                Min Payment
              </div>
              <div className="text-sm text-blue-200 mt-2">
                True micro-transactions
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform">
                &lt;1s
              </div>
              <div className="text-blue-100 font-medium text-lg">
                Payment Speed
              </div>
              <div className="text-sm text-blue-200 mt-2">
                Base L2 settlement
              </div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform">
                100%
              </div>
              <div className="text-blue-100 font-medium text-lg">
                Creator Revenue
              </div>
              <div className="text-sm text-blue-200 mt-2">
                You set the price
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
              Simple setup, immediate revenue
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "List Your API",
                desc: "Add your MCP server, AI model, or API endpoint to our platform",
                color: "from-blue-500 to-cyan-400",
              },
              {
                step: "2",
                title: "Set Your Price",
                desc: "Define pricing per call, per token, or per usage - you control the economics",
                color: "from-purple-500 to-pink-400",
              },
              {
                step: "3",
                title: "Users Pay & Access",
                desc: "When someone uses your API, they pay instantly with crypto",
                color: "from-emerald-500 to-teal-400",
              },
              {
                step: "4",
                title: "Receive Payments",
                desc: "Payments flow directly to your CDP wallet in real-time",
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
            Join the crypto-native AI economy. Turn your MCP servers, AI models,
            and APIs into revenue streams with global reach.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
              Launch Platform
            </button>
            <button className="border-2 border-gray-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center">
              <ExternalLink className="mr-2 w-5 h-5" />
              API Documentation
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
            <div className="text-sm text-gray-500">
              Built with x402, CDP Wallet, and AWS Bedrock
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            © 2025 AI402 Platform. Enabling the crypto-native AI economy. Built
            for Coinbase Agents in Action Hackathon.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
