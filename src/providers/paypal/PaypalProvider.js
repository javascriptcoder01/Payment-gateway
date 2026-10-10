const axios = require('axios');
const PaymentProvider = require('../base/PaymentProvider');

class PaypalProvider extends PaymentProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl; // sandbox or live, from env
  }

  async _getAccessToken() {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return data.access_token;
  }

  async createOrder({ amount, currency = 'USD', receipt }) {
    const token = await this._getAccessToken();

    const { data } = await axios.post(
      `${this.baseUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: receipt || `rcpt_${Date.now()}`,
            amount: { currency_code: currency, value: amount.toFixed(2) },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return {
      success: true,
      gateway: 'paypal',
      orderId: data.id, // frontend PayPal Buttons SDK uses this
      status: data.status,
      amount,
      currency,
      raw: data,
    };
  }

  /**
   * PayPal "verification" = capturing the order after user approval on frontend.
   */
  async verifyPayment({ orderId }) {
    const token = await this._getAccessToken();
    const { data } = await axios.post(
      `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return {
      success: data.status === 'COMPLETED',
      status: data.status,
      gateway: 'paypal',
      raw: data,
    };
  }

  /**
   * PayPal webhooks need signature verification via their /v1/notifications/verify-webhook-signature
   * endpoint. Requires PAYPAL_WEBHOOK_ID (create one in PayPal dashboard -> Webhooks).
   */
  async handleWebhook(payload, headers) {
    const token = await this._getAccessToken();
    const verifyRes = await axios.post(
      `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: this.config.webhookId,
        webhook_event: payload,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (verifyRes.data.verification_status !== 'SUCCESS') {
      throw new Error('PayPal webhook signature verification failed');
    }

    return { event: payload.event_type, data: payload.resource, gateway: 'paypal' };
  }

  async refund({ captureId, amount, currency = 'USD' }) {
    const token = await this._getAccessToken();
    const { data } = await axios.post(
      `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
      amount ? { amount: { value: amount.toFixed(2), currency_code: currency } } : {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return { success: data.status === 'COMPLETED', gateway: 'paypal', raw: data };
  }
}

module.exports = PaypalProvider;
