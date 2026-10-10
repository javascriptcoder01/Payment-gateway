require('dotenv').config();
const env = require('./env');

/**
 * Single source of truth for all gateway credentials.
 * Swap DEMO -> LIVE simply by changing the .env values.
 * No code change needed in providers when you go live
 * (except PayU / Paytm / PhonePe base URLs which read
 * straight from env too — see .env.example).
 */
module.exports = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
  },

  payu: {
    merchantKey: process.env.PAYU_MERCHANT_KEY,
    merchantSalt: process.env.PAYU_MERCHANT_SALT,
    baseUrl: process.env.PAYU_BASE_URL || 'https://test.payu.in',
    surl: `${env.BASE_URL}/api/payments/payu/success`,
    furl: `${env.BASE_URL}/api/payments/payu/failure`,
  },

  paytm: {
    merchantId: process.env.PAYTM_MERCHANT_ID,
    merchantKey: process.env.PAYTM_MERCHANT_KEY,
    website: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
    industryType: process.env.PAYTM_INDUSTRY_TYPE || 'Retail',
    channelId: process.env.PAYTM_CHANNEL_ID || 'WEB',
    baseUrl: process.env.PAYTM_BASE_URL || 'https://securegw-stage.paytm.in',
    callbackUrl: `${env.BASE_URL}/api/payments/paytm/callback`,
  },

  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    saltKey: process.env.PHONEPE_SALT_KEY,
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    baseUrl: process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox',
    redirectUrl: `${env.BASE_URL}/api/payments/phonepe/callback`,
    callbackUrl: `${env.BASE_URL}/api/payments/phonepe/callback`,
  },
};
