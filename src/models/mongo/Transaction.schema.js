const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    gateway: { type: String, required: true }, // stripe | razorpay | paypal | payu | paytm | phonepe
    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: String,
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['created', 'success', 'failed', 'refunded'],
      default: 'created',
    },
    customer: {
      name: String,
      email: String,
      phone: String,
    },
    raw: mongoose.Schema.Types.Mixed, // full gateway response, kept for debugging/audit
  },
  { timestamps: true } // adds createdAt, updatedAt automatically
);

module.exports = mongoose.model('Transaction', transactionSchema);
