import axios from "axios";
import { config } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";

config();

const url =
  "http://localhost:3001/proxy/fcf9f206-8e27-4d9b-a7b2-f73b6090752c/chat";
const privateKey = process.env.PRIVATE_KEY;

// Chat request payload for the AI model (Bedrock format)
const chatRequest = {
  messages: [
    {
      role: "user",
      content: [
        {
          text: "Hello! Can you tell me a fun fact about artificial intelligence?",
        },
      ],
    },
  ],
  temperature: 0.7,
  max_tokens: 150,
};

async function testNovaProAI() {
  console.log("🤖 Testing Nova Pro AI Model:", url);

  // Step 1: Try without payment (should get 402)
  console.log("\n📞 Calling AI model without payment...");
  try {
    const response = await axios.post(url, chatRequest, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(
      "❌ Unexpected: Got AI response without payment:",
      response.data
    );
  } catch (error) {
    if (error.response?.status === 402) {
      console.log("✅ Got 402 Payment Required");
      console.log("💰 Payment details:");
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(
        "❌ Unexpected error:",
        error.response?.status,
        error.message
      );
      return;
    }
  }

  // Step 2: Try with payment
  if (!privateKey) {
    console.log("\n⚠️  No PRIVATE_KEY in .env - cannot test payment");
    return;
  }

  console.log("\n💳 Making payment for AI inference...");
  try {
    const account = privateKeyToAccount(privateKey);
    console.log("Using wallet:", account.address);

    const api = withPaymentInterceptor(axios.create(), account);
    const response = await api.post(url, chatRequest, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Payment successful!");
    console.log("🤖 AI Response:");
    console.log("=".repeat(50));

    // Parse and display the AI response nicely
    if (response.data.choices && response.data.choices[0]) {
      console.log(response.data.choices[0].message.content);
    } else {
      console.log(JSON.stringify(response.data, null, 2));
    }

    console.log("=".repeat(50));

    // Show usage and pricing info if available
    if (response.data.usage) {
      console.log("📊 Token Usage:");
      console.log(
        `   Input tokens: ${response.data.usage.inputTokens || "N/A"}`
      );
      console.log(
        `   Output tokens: ${response.data.usage.outputTokens || "N/A"}`
      );
      console.log(
        `   Total tokens: ${response.data.usage.totalTokens || "N/A"}`
      );
    }

    // Show payment confirmation if available
    if (response.headers["x-payment-response"]) {
      console.log(
        "💳 Payment confirmation:",
        response.headers["x-payment-response"]
      );
    }
  } catch (error) {
    console.log("❌ Payment failed:", error.response?.status);
    console.log("Error:", error.response?.data || error.message);

    // If there's a transaction hash, show it
    if (error.response?.data?.transaction) {
      console.log("🔗 Transaction details:", error.response.data.transaction);
    }
  }
}

// Test with different messages
async function testMultipleQueries() {
  if (!privateKey) {
    console.log("⚠️  No PRIVATE_KEY in .env - skipping multiple queries test");
    return;
  }

  const queries = [
    "What's the weather like on Mars?",
    "Explain quantum computing in simple terms",
    "Write a haiku about programming",
  ];

  console.log("\n🔄 Testing multiple AI queries...");

  const account = privateKeyToAccount(privateKey);
  const api = withPaymentInterceptor(axios.create(), account);

  for (let i = 0; i < queries.length; i++) {
    console.log(`\n📝 Query ${i + 1}: "${queries[i]}"`);

    try {
      const response = await api.post(
        url,
        {
          messages: [
            {
              role: "user",
              content: [{ text: queries[i] }],
            },
          ],
          temperature: 0.8,
          max_tokens: 100,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.choices && response.data.choices[0]) {
        console.log("🤖 Response:", response.data.choices[0].message.content);
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(
        `❌ Query ${i + 1} failed:`,
        error.response?.data?.error || error.message
      );
    }
  }
}

// Run the tests
async function runAllTests() {
  await testNovaProAI();
  //   await testMultipleQueries();
}

runAllTests().catch(console.error);
