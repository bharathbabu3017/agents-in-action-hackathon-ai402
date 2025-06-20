import axios from "axios";
import { config } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";

config();

// Replace with your actual proxy URL for this API
const url =
  "https://www.ai402proxy.xyz/proxy/2285f39f-933b-42e7-94d4-c148762b54e8/send-message";
const privateKey = process.env.PRIVATE_KEY;

async function testMessageAPI() {
  console.log("🚀 Testing Message API:", url);

  const messagePayload = {
    message: "Hello from the test script!",
  };

  const headers = {
    "Content-Type": "application/json",
  };

  // Step 1: Try without payment (should get 402)
  console.log("\n📞 Sending message without payment...");
  try {
    const response = await axios.post(url, messagePayload, { headers });
    console.log("❌ Unexpected: Got response without payment:", response.data);
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

  console.log("\n💳 Making payment for message API...");
  try {
    const account = privateKeyToAccount(privateKey);
    console.log("Using wallet:", account.address);

    const api = withPaymentInterceptor(axios.create(), account);
    const response = await api.post(url, messagePayload, { headers });

    console.log("✅ Payment successful!");
    console.log("📄 API Response:", response.data);

    // Show payment details if available
    if (response.headers["x-payment-response"]) {
      console.log(
        "💳 Payment confirmation:",
        response.headers["x-payment-response"]
      );
    }
  } catch (error) {
    console.log("❌ Payment failed:", error.response?.status);
    console.log("Error:", error.response?.data || error.message);
  }
}

testMessageAPI().catch(console.error);
