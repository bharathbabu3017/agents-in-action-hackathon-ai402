import axios from "axios";
import { config } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";

config();

const url =
  "https://www.ai402proxy.xyz/proxy/1d33f485-b478-42a7-b53a-682cba5a1574/rickroll";
const privateKey = process.env.PRIVATE_KEY;

async function testPayment() {
  console.log("🚀 Testing URL:", url);

  // Step 1: Try without payment (should get 402)
  console.log("\n📞 Calling without payment...");
  try {
    const response = await axios.post(url);
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

  console.log("\n💳 Making payment...");
  try {
    const account = privateKeyToAccount(privateKey);
    console.log("Using wallet:", account.address);

    const api = withPaymentInterceptor(axios.create(), account);
    const response = await api.post(url);

    console.log("✅ Payment successful!");
    console.log("📄 Response:", response.data);

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

testPayment().catch(console.error);
