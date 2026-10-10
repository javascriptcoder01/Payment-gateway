const StripeProvider = require('../providers/stripe/StripeProvider');
const RazorpayProvider = require('../providers/razorpay/RazorpayProvider');
const PaypalProvider = require('../providers/paypal/PaypalProvider');
const PayuProvider = require('../providers/payu/PayuProvider');
const PaytmProvider = require('../providers/paytm/PaytmProvider');
const PhonepeProvider = require('../providers/phonepe/PhonepeProvider');
const config = require('../config/gateways.config');

const registry = {
  stripe: () => new StripeProvider(config.stripe),
  razorpay: () => new RazorpayProvider(config.razorpay),
  paypal: () => new PaypalProvider(config.paypal),
  payu: () => new PayuProvider(config.payu),
  paytm: () => new PaytmProvider(config.paytm),
  phonepe: () => new PhonepeProvider(config.phonepe),
};

const cache = {};

class PaymentFactory {
  /**
   * @param {'stripe'|'razorpay'|'paypal'|'payu'|'paytm'|'phonepe'} gateway
   */
  static getProvider(gateway) {
    const key = String(gateway || '').toLowerCase();
    if (!registry[key]) {
      throw new Error(`Unsupported payment gateway: "${gateway}". Supported: ${Object.keys(registry).join(', ')}`);
    }
    if (!cache[key]) cache[key] = registry[key]();
    return cache[key];
  }

  static getSupportedGateways() {
    return Object.keys(registry);
  }
}

module.exports = PaymentFactory;
