export const getSchemaTemplate = (resourceType, originalUrl) => {
  // Auto-detect common API patterns
  if (originalUrl.includes("openai.com")) {
    return {
      exampleRequest: {
        messages: [{ role: "user", content: "Hello!" }],
        temperature: 0.7,
        max_tokens: 1000,
      },
      exampleResponse: {
        choices: [{ message: { content: "Response text" } }],
        usage: { total_tokens: 150 },
      },
    };
  }

  if (originalUrl.includes("anthropic.com")) {
    return {
      exampleRequest: {
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello!" }],
        max_tokens: 1000,
      },
      exampleResponse: {
        content: [{ text: "Response text" }],
        usage: { input_tokens: 10, output_tokens: 140 },
      },
    };
  }

  // Default template for custom APIs
  return {
    exampleRequest: {},
    exampleResponse: {},
    requiredHeaders: [],
    supportedMethods: ["POST"],
  };
};
