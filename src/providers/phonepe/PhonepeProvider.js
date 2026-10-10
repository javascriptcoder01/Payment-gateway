const crypto = require('crypto');
const axios = require('axios');
const PaymentProvider = require('../base/PaymentProvider');

class PhonepeProvider extends PaymentProvider {
  constructor(config) {
    super(config);
  }

  _generateXVerify(base64Payload, endpoint) {
    const { saltKey, saltIndex } = this.config;
    const stringToHash = base64Payload + endpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${sha256}###${saltIndex}`;
  }

  async createOrder({ amount, orderId, userId, phone }) {
    const finalOrderId = orderId || `order_${Date.now()}`;
    const endpoint = '/pg/v1/pay';

    const payload = {
      merchantId: this.config.merchantId,
      merchantTransactionId: finalOrderId,
      merchantUserId: userId || `user_${Date.now()}`,
      amount: Math.round(amount * 100), // paise
      redirectUrl: this.config.redirectUrl,
      redirectMode: 'POST',
      callbackUrl: this.config.callbackUrl,
      mobileNumber: phone,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = this._generateXVerify(base64Payload, endpoint);

    const { data } = await axios.post(
      `${this.config.baseUrl}${endpoint}`,
      { request: base64Payload },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify } }
    );

    return {
      success: data.success,
      gateway: 'phonepe',
      orderId: finalOrderId,
      redirectUrl: data?.data?.instrumentResponse?.redirectInfo?.url, // frontend redirects user here
      raw: data,
    };
  }

  /**
   * Called from your /phonepe/callback route OR to actively poll status.
   * PhonePe recommends calling the status-check API rather than trusting
   * the callback alone (server-to-server confirmation).
   */
  async verifyPayment({ merchantTransactionId }) {
    const endpoint = `/pg/v1/status/${this.config.merchantId}/${merchantTransactionId}`;
    const { saltKey, saltIndex } = this.config;
    const stringToHash = endpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = `${sha256}###${saltIndex}`;

    const { data } = await axios.get(`${this.config.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': this.config.merchantId,
      },
    });

    return {
      success: data.success && data.code === 'PAYMENT_SUCCESS',
      status: data.code,
      gateway: 'phonepe',
      orderId: merchantTransactionId,
      raw: data,
    };
  }

  async handleWebhook(payload) {
    // PhonePe posts a base64 "response" field to your callback URL.
    const decoded = JSON.parse(Buffer.from(payload.response, 'base64').toString('utf8'));
    return this.verifyPayment({ merchantTransactionId: decoded.data.merchantTransactionId });
  }

  async refund({ merchantTransactionId, amount, refundId }) {
    const endpoint = '/pg/v1/refund';
    const payload = {
      merchantId: this.config.merchantId,
      merchantTransactionId,
      originalTransactionId: merchantTransactionId,
      merchantRefundId: refundId || `refund_${Date.now()}`,
      amount: Math.round(amount * 100),
      callbackUrl: this.config.callbackUrl,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = this._generateXVerify(base64Payload, endpoint);

    const { data } = await axios.post(
      `${this.config.baseUrl}${endpoint}`,
      { request: base64Payload },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify } }
    );

    return { success: data.success, gateway: 'phonepe', raw: data };
  }
}

module.exports = PhonepeProvider;
