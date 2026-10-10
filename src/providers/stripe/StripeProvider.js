const Stripe = require('stripe');
const PaymentProvider = require('../base/PaymentProvider');

class StripeProvider extends PaymentProvider {
  constructor(config) {
    super(config);
    this.stripe = Stripe(config.secretKey);
  }

  /**
   * @param {Object} orderData
   * @param {number} orderData.amount - amount in main currency unit (e.g. 499.00)
   * @param {string} [orderData.currency='inr']
   * @param {string} [orderData.receipt]
   * @param {Object} [orderData.notes]
   */
  async createOrder({ amount, currency = 'inr', receipt, notes = {} }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe wants smallest currency unit (paise/cents)
      currency,
      metadata: { receipt: receipt || '', ...notes },
      automatic_payment_methods: { enabled: true },
    });

    return {
      success: true,
      gateway: 'stripe',
      orderId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret, // frontend uses this with Stripe.js
      amount,
      currency,
      raw: paymentIntent,
    };
  }

  async verifyPayment({ paymentIntentId }) {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: intent.status === 'succeeded',
      status: intent.status,
      gateway: 'stripe',
      amount: intent.amount / 100,
      currency: intent.currency,
      raw: intent,
    };
  }

  /**
   * NOTE: Stripe webhook signature verification needs the RAW request body
   * (not JSON-parsed). See src/app.js where we mount express.raw() only
   * for the /webhook/stripe route.
   */
  async handleWebhook(rawBody, headers) {
    const sig = headers['stripe-signature'];
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, this.config.webhookSecret);
    } catch (err) {
      throw new Error(`Stripe webhook signature verification failed: ${err.message}`);
    }
    return { event: event.type, data: event.data.object, gateway: 'stripe' };
  }

  async refund({ paymentIntentId, amount }) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    return {
      success: refund.status === 'succeeded' || refund.status === 'pending',
      gateway: 'stripe',
      raw: refund,
    };
  }
}

module.exports = StripeProvider;
