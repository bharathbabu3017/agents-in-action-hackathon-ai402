import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    resourceId: {
      type: String,
      required: true,
    },
    resourceName: String,
    fromAddress: {
      type: String,
      required: true,
    },
    toAddress: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USDC",
    },
    txHash: String,
    toolUsed: String,
    requestData: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
    blockNumber: Number,
    gasUsed: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Transaction", TransactionSchema);
