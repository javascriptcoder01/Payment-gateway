/**
 * Every gateway provider MUST implement this contract.
 * This is what makes the whole system "plug and play" —
 * your controller/service never needs to know which gateway
 * it's talking to.
 */
class PaymentProvider {
  constructor(config) {
    if (new.target === PaymentProvider) {
      throw new Error('PaymentProvider is abstract and cannot be instantiated directly');
    }
    this.config = config;
  }

  // Create an order/intent on the gateway. Returns data the frontend needs to open checkout.
  // eslint-disable-next-line no-unused-vars
  async createOrder(orderData) {
    throw new Error('createOrder() not implemented');
  }

  // Verify a payment after the user completes checkout (signature / status check).
  // eslint-disable-next-line no-unused-vars
  async verifyPayment(paymentData) {
    throw new Error('verifyPayment() not implemented');
  }

  // Handle async server-to-server webhook/callback from the gateway.
  // eslint-disable-next-line no-unused-vars
  async handleWebhook(payload, headers) {
    throw new Error('handleWebhook() not implemented');
  }

  // Refund a payment, fully or partially.
  // eslint-disable-next-line no-unused-vars
  async refund(refundData) {
    throw new Error('refund() not implemented');
  }
}

module.exports = PaymentProvider;
