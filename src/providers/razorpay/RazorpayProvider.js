const Razorpay = require('razorpay');
const crypto = require('crypto');
const PaymentProvider = require('../base/PaymentProvider');

class RazorpayProvider extends PaymentProvider {
  constructor(config) {
    super(config);
    this.instance = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
  }

  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const order = await this.instance.orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes,
    });

    return {
      success: true,
      gateway: 'razorpay',
      orderId: order.id,
      amount,
      currency,
      keyId: this.config.keyId, // frontend Checkout.js needs this
      raw: order,
    };
  }

  /**
   * Razorpay verification happens on the CLIENT-side success callback data:
   * razorpay_order_id, razorpay_payment_id, razorpay_signature
   */
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    return {
      success: isValid,
      gateway: 'razorpay',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    };
  }

  async handleWebhook(rawBody, headers) {
    const signature = headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Razorpay webhook signature verification failed');
    }

    const payload = JSON.parse(rawBody);
    return { event: payload.event, data: payload.payload, gateway: 'razorpay' };
  }

  async refund({ paymentId, amount }) {
    const refund = await this.instance.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    return { success: true, gateway: 'razorpay', raw: refund };
  }
}

module.exports = RazorpayProvider;
