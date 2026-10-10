const crypto = require('crypto');
const axios = require('axios');
const PaymentProvider = require('../base/PaymentProvider');

/**
 * Paytm uses AES-128-CBC checksum generation (their own algorithm, not plain HMAC).
 * Below is a self-contained implementation of their checksum logic so you don't
 * need their old unmaintained 'paytmchecksum' package. Logic matches Paytm's
 * official checksum spec.
 */
function generateChecksum(params, key) {
  const salt = crypto.randomBytes(4).toString('hex');
  const strToHash = paramsToString(params) + '|' + salt;
  const hash = crypto.createHash('sha256').update(strToHash).digest('hex') + salt;
  return encrypt(hash, key);
}

function verifyChecksum(params, key, checksum) {
  const paytmHash = decrypt(checksum, key);
  const salt = paytmHash.substr(paytmHash.length - 4);
  const strToHash = paramsToString(params) + '|' + salt;
  const calculatedHash = crypto.createHash('sha256').update(strToHash).digest('hex') + salt;
  return calculatedHash === paytmHash;
}

function paramsToString(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '' && k !== 'CHECKSUMHASH')
    .sort()
    .map((k) => params[k])
    .join('|');
}

function encrypt(input, key) {
  const iv = '@@@@&&&&####$$$$'; // Paytm's fixed IV, 16 chars
  const cipher = crypto.createCipheriv('aes-128-cbc', key.substring(0, 16), iv);
  let encrypted = cipher.update(input, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decrypt(input, key) {
  const iv = '@@@@&&&&####$$$$';
  const decipher = crypto.createDecipheriv('aes-128-cbc', key.substring(0, 16), iv);
  let decrypted = decipher.update(input, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class PaytmProvider extends PaymentProvider {
  constructor(config) {
    super(config);
  }

  async createOrder({ amount, orderId, custId, email, phone }) {
    const finalOrderId = orderId || `order_${Date.now()}`;

    const paytmParams = {
      MID: this.config.merchantId,
      WEBSITE: this.config.website,
      CHANNEL_ID: this.config.channelId,
      INDUSTRY_TYPE_ID: this.config.industryType,
      ORDER_ID: finalOrderId,
      CUST_ID: custId,
      TXN_AMOUNT: Number(amount).toFixed(2),
      CALLBACK_URL: this.config.callbackUrl,
      EMAIL: email,
      MOBILE_NO: phone,
    };

    const checksum = generateChecksum(paytmParams, this.config.merchantKey);

    // Step 1: get a txnToken from Paytm's Initiate Transaction API
    const initiateUrl = `${this.config.baseUrl}/theia/api/v1/initiateTransaction?mid=${this.config.merchantId}&orderId=${finalOrderId}`;
    const { data } = await axios.post(initiateUrl, {
      body: paytmParams,
      head: { signature: checksum },
    });

    return {
      success: data?.body?.resultInfo?.resultStatus === 'S',
      gateway: 'paytm',
      orderId: finalOrderId,
      txnToken: data?.body?.txnToken, // frontend Paytm JS Checkout uses this
      mid: this.config.merchantId,
      amount,
      raw: data,
    };
  }

  /**
   * Called from your /paytm/callback route (Paytm POSTs the result back).
   */
  async verifyPayment(responseData) {
    const { CHECKSUMHASH, ...rest } = responseData;
    const isValid = verifyChecksum(rest, this.config.merchantKey, CHECKSUMHASH);

    return {
      success: isValid && responseData.STATUS === 'TXN_SUCCESS',
      status: responseData.STATUS,
      gateway: 'paytm',
      orderId: responseData.ORDERID,
      raw: responseData,
    };
  }

  async handleWebhook(payload) {
    return this.verifyPayment(payload);
  }

  async refund({ orderId, txnId, amount, refId }) {
    const params = {
      MID: this.config.merchantId,
      TXNID: txnId,
      ORDERID: orderId,
      REFID: refId || `ref_${Date.now()}`,
      TXNTYPE: 'REFUND',
      REFUNDAMOUNT: Number(amount).toFixed(2),
    };
    const checksum = generateChecksum(params, this.config.merchantKey);

    const { data } = await axios.post(`${this.config.baseUrl}/refund/apply`, {
      body: params,
      head: { signature: checksum },
    });

    return { success: data?.body?.resultInfo?.resultStatus === 'TXN_SUCCESS', gateway: 'paytm', raw: data };
  }
}

module.exports = PaytmProvider;
