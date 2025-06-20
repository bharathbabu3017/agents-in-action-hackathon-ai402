// AgentKit Integration Examples

// Example 1: Simple API call
const agentInstruction1 = `
Pay and make a POST request to ${apiUrl} with the following JSON:
{
  "message": "sent by agentkit bot",
  "timestamp": "${new Date().toISOString()}"
}
`;

// Example 2: AI Model call
const agentInstruction2 = `
Pay and make a POST request to ${aiModelUrl} to generate a response to: "What's the weather like?"
Use this format:
{
  "messages": [{"role": "user", "content": "What's the weather like?"}],
  "temperature": 0.7,
  "max_tokens": 150
}
`;

console.log("AgentKit Instructions:");
console.log("1. For messaging API:", agentInstruction1);
console.log("2. For AI model:", agentInstruction2);
