import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Wallet,
  Bot,
  User,
  Zap,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

// Simple text cleaner to remove markdown syntax
const cleanMarkdown = (text) => {
  return text
    .replace(/^#{1,6}\s*/gm, "") // Remove # headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove ** bold markers
    .replace(/\*(.*?)\*/g, "$1") // Remove * italic markers
    .replace(/`([^`]+)`/g, "$1") // Remove ` code markers
    .replace(/```[\s\S]*?```/g, (match) => {
      // Clean code blocks but preserve content
      return match.replace(/```\w*\n?/g, "").replace(/```$/g, "");
    })
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Convert links to just text
};

const Playground = () => {
  // Get resourceId from URL manually
  const resourceId = window.location.pathname.split("/").pop();
  const isPreselected = resourceId && resourceId !== "playground";

  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [walletClient, setWalletClient] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`web-session-${Date.now()}`);

  // Resource selection
  const [availableLLMs, setAvailableLLMs] = useState([]);
  const [availableMCPs, setAvailableMCPs] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [selectedMCP, setSelectedMCP] = useState(null);
  const [loadingResources, setLoadingResources] = useState(true);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState(null);
  const [pendingUserInput, setPendingUserInput] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const messagesEndRef = useRef(null);
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

  // USDC token address on Base Sepolia
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (isPreselected && availableMCPs.length > 0) {
      const preselectedMCP = availableMCPs.find((mcp) => mcp.id === resourceId);
      if (preselectedMCP) {
        setSelectedMCP(preselectedMCP);
      }
    }
  }, [resourceId, availableMCPs, isPreselected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadResources = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resources`);
      const resources = await response.json();

      const llms = resources.filter((r) => r.type === "ai_model");
      const mcps = resources.filter((r) => r.type === "mcp_server");

      setAvailableLLMs(llms);
      setAvailableMCPs(mcps);

      // Auto-select first LLM if none selected
      if (llms.length > 0) {
        setSelectedLLM(llms[0]);
      }

      // Auto-select first MCP if none selected and no resourceId
      if (!isPreselected && mcps.length > 0) {
        setSelectedMCP(mcps[0]);
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setLoadingResources(false);
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        // Import viem dynamically
        const { createWalletClient, custom, publicActions } = await import(
          "viem"
        );
        const { baseSepolia } = await import("viem/chains");

        // Create wallet client using the browser's injected provider (MetaMask)
        const client = createWalletClient({
          account: accounts[0],
          transport: custom(window.ethereum), // Use browser wallet, not HTTP RPC
          chain: baseSepolia,
        }).extend(publicActions);

        setWalletClient(client);
        setAccount(accounts[0]);
        setIsConnected(true);

        await loadBalances(client, accounts[0]);
      } else {
        alert("Please install Coinbase Wallet or MetaMask");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const loadBalances = async (client, address) => {
    try {
      // Get ETH balance
      const ethBal = await client.getBalance({ address });
      setEthBalance((Number(ethBal) / 1e18).toFixed(4));

      // Get USDC balance
      const usdcBal = await client.readContract({
        address: USDC_ADDRESS,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [address],
      });

      setUsdcBalance((Number(usdcBal) / 1e6).toFixed(2));
    } catch (error) {
      console.error("Failed to load balances:", error);
      // Set fallback values on error
      setEthBalance("0.0000");
      setUsdcBalance("0.00");
    }
  };

  const refreshBalances = () => {
    if (walletClient && account) {
      loadBalances(walletClient, account);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !selectedLLM || !selectedMCP) return;

    const userMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/playground/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          llmModelId: selectedLLM.llmConfig.modelId,
          mcpResourceId: selectedMCP.id,
          messages: newMessages.map((msg) => ({
            role: msg.role,
            content: [{ text: msg.content }],
          })),
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.type === "llm_response") {
        const assistantMessage = {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (response.status === 402) {
        // Tool payment required
        setPendingToolCall(data.toolCall);
        setPendingUserInput(inputValue);
        setShowPaymentModal(true);
      } else {
        throw new Error(data.message || "Request failed");
      }
    } catch (error) {
      const errorMessage = {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!isConnected || !pendingToolCall || !walletClient) return;

    setProcessingPayment(true);

    try {
      console.log("Starting payment process...");

      // Import x402-axios and axios
      const { withPaymentInterceptor } = await import("x402-axios");
      const axios = await import("axios");

      // Create axios instance with payment interceptor using browser wallet
      const api = withPaymentInterceptor(
        axios.default.create({
          baseURL: API_BASE_URL,
        }),
        walletClient
      );

      console.log(
        "Created payment interceptor with browser wallet, making request..."
      );

      // Execute tool with payment - x402-axios will handle the 402 flow automatically
      const response = await api.post("/api/playground/chat", {
        llmModelId: selectedLLM.llmConfig.modelId,
        mcpResourceId: selectedMCP.id,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: [{ text: msg.content }],
        })),
        confirmedToolCall: pendingToolCall,
        sessionId: sessionId,
      });

      console.log("Payment response:", response.data);

      if (response.data.type === "tool_executed") {
        const assistantMessage = {
          role: "assistant",
          content: response.data.response,
          timestamp: new Date(),
          toolUsed: response.data.toolUsed,
          transaction: response.data.transaction,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Refresh balances after successful payment
        await loadBalances(walletClient, account);

        console.log("Payment successful, updated UI");
      }
    } catch (error) {
      console.error("Payment error:", error);

      let errorMessage = "Payment failed";
      if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      const assistantErrorMessage = {
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, assistantErrorMessage]);

      // Show additional payment error details if available
      if (error.response?.data?.transaction) {
        const tx = error.response.data.transaction;
        console.log("Transaction details:", tx);
        if (tx.blockchainTxHash) {
          console.log(`Failed TX Hash: ${tx.blockchainTxHash}`);
          console.log(`Explorer: ${tx.explorerUrl}`);
        }
      }
    } finally {
      setProcessingPayment(false);
      setShowPaymentModal(false);
      setPendingToolCall(null);
      setPendingUserInput("");
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const needsFunds =
    parseFloat(ethBalance) < 0.001 || parseFloat(usdcBalance) < 1;

  if (loadingResources) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading playground resources...</p>
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
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  AI402 MCP Playground
                </h1>
              </div>
              <button
                onClick={() => window.history.back()}
                className="flex items-center text-gray-600 hover:text-gray-800 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Browse Tools
              </button>
            </div>

            {/* Wallet Section */}
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatAddress(account)}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center space-x-2">
                      <span>ETH: {ethBalance}</span>
                      <span>USDC: {usdcBalance}</span>
                      <button
                        onClick={refreshBalances}
                        className="hover:text-blue-600"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Resource Selection */}
          <div className="lg:col-span-4 flex flex-col h-[720px] space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Configuration</h3>

              {/* LLM Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Model
                </label>
                <select
                  value={selectedLLM?.id || ""}
                  onChange={(e) => {
                    const llm = availableLLMs.find(
                      (l) => l.id === e.target.value
                    );
                    setSelectedLLM(llm);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {availableLLMs.map((llm) => (
                    <option key={llm.id} value={llm.id}>
                      {llm.name}
                    </option>
                  ))}
                </select>
                {selectedLLM && (
                  <p className="text-xs text-gray-500 mt-1">
                    Free • {selectedLLM.description}
                  </p>
                )}
              </div>

              {/* MCP Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MCP Server
                </label>
                <select
                  value={selectedMCP?.id || ""}
                  onChange={(e) => {
                    const mcp = availableMCPs.find(
                      (m) => m.id === e.target.value
                    );
                    setSelectedMCP(mcp);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {availableMCPs.map((mcp) => (
                    <option key={mcp.id} value={mcp.id}>
                      {mcp.name}
                    </option>
                  ))}
                </select>
                {selectedMCP && (
                  <p className="text-xs text-gray-500 mt-1">
                    Pay per use • {selectedMCP.description}
                  </p>
                )}
              </div>

              {/* Funding Notice */}
              {isConnected && needsFunds && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Need Test Funds?
                      </p>
                      <div className="text-xs text-amber-700 mt-1 space-y-1">
                        <div>
                          <a
                            href="https://portal.cdp.coinbase.com/products/faucet"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-amber-900 flex items-center"
                          >
                            Get ETH <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                        <div>
                          <a
                            href="https://faucet.circle.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-amber-900 flex items-center"
                          >
                            Get USDC <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Available Tools */}
            {selectedMCP &&
              selectedMCP.mcpTools &&
              selectedMCP.mcpTools.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col min-h-0">
                  <div className="p-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-blue-600" />
                      Available Tools ({selectedMCP.mcpTools.length})
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    <div className="space-y-3">
                      {selectedMCP.mcpTools.map((tool, index) => (
                        <div
                          key={tool._id || index}
                          className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 mb-1">
                                {tool.name.replace(/_/g, " ")}
                              </h4>
                              {tool.description && (
                                <p className="text-xs text-gray-600 mb-2">
                                  {tool.description}
                                </p>
                              )}
                              {tool.inputSchema?.properties && (
                                <div className="text-xs text-gray-500">
                                  <div className="flex flex-wrap gap-1">
                                    <span className="font-medium">
                                      Parameters:
                                    </span>
                                    {Object.keys(
                                      tool.inputSchema.properties
                                    ).map((param, i) => (
                                      <span
                                        key={param}
                                        className="bg-gray-100 px-1.5 py-0.5 rounded text-xs"
                                      >
                                        {param}
                                        {tool.inputSchema.required?.includes(
                                          param
                                        ) && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="ml-2 text-xs text-gray-400">
                              ${selectedMCP.pricing.defaultAmount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg border border-gray-200 h-[720px] flex flex-col">
              {/* Chat Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Chat Interface
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedLLM?.name} + {selectedMCP?.name}
                    </p>
                  </div>
                  {!isConnected && (
                    <div className="text-sm text-amber-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Connect wallet to use tools
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Start a conversation with your AI assistant!</p>
                    <p className="text-sm mt-1">
                      Ask questions that might need real-time data to see tool
                      usage in action.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : message.isError
                          ? "bg-red-50 border border-red-200 text-red-800"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === "assistant" && (
                          <Bot
                            className={`w-7 h-7 mt-0.5 flex-shrink-0 ${
                              message.isError ? "text-red-600" : "text-gray-600"
                            }`}
                          />
                        )}
                        {message.role === "user" && (
                          <User className="w-5 h-5 mt-0.5 text-blue-100" />
                        )}
                        <div>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.role === "assistant" && !message.isError
                              ? cleanMarkdown(message.content)
                              : message.content}
                          </div>
                          {message.toolUsed && (
                            <div className="mt-2 text-xs opacity-75">
                              <div className="flex items-center space-x-1">
                                <Zap className="w-3 h-3" />
                                <span>Used: {message.toolUsed}</span>
                              </div>
                              {message.transaction && (
                                <div className="mt-1">
                                  <div>Paid: ${message.transaction.amount}</div>
                                  {message.transaction.explorerUrl && (
                                    <a
                                      href={message.transaction.explorerUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline flex items-center"
                                    >
                                      View TX{" "}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin text-gray-600" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading || !selectedLLM || !selectedMCP}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={
                      isLoading ||
                      !inputValue.trim() ||
                      !selectedLLM ||
                      !selectedMCP
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && pendingToolCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tool Payment Required
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-700">Tool:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {pendingToolCall.name}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Reasoning:
                </span>
                <p className="text-sm text-gray-900 mt-1">
                  {pendingToolCall.reasoning}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Parameters:
                </span>
                <pre className="text-xs bg-gray-100 rounded p-2 mt-1 overflow-x-auto">
                  {JSON.stringify(pendingToolCall.parameters, null, 2)}
                </pre>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Cost:</span>
                  <span className="text-lg font-bold text-blue-900">
                    ${pendingToolCall.pricing.amount}
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {pendingToolCall.pricing.description}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={processingPayment}
              >
                Cancel
              </button>
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={processingPayment}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={processingPayment}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {processingPayment ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Pay & Execute
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playground;
