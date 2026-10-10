const crypto = require('crypto');
const PaymentProvider = require('../base/PaymentProvider');

class PayuProvider extends PaymentProvider {
  constructor(config) {
    super(config);
  }

  _generateHash({ txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '' }) {
    // PayU hash sequence (FIXED — do not reorder):
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const { merchantKey, merchantSalt } = this.config;
    const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${merchantSalt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * PayU is a redirect/form-post gateway — there's no server-side "create order" API call.
   * We just build the signed form fields; your frontend auto-submits a <form> to PayU.
   */
  async createOrder({ amount, productinfo, firstname, email, phone, txnid }) {
    const finalTxnId = txnid || `txn_${Date.now()}`;
    const amountStr = Number(amount).toFixed(2);

    const hash = this._generateHash({
      txnid: finalTxnId,
      amount: amountStr,
      productinfo,
      firstname,
      email,
    });

    return {
      success: true,
      gateway: 'payu',
      orderId: finalTxnId,
      formAction: `${this.config.baseUrl}/_payment`,
      formFields: {
        key: this.config.merchantKey,
        txnid: finalTxnId,
        amount: amountStr,
        productinfo,
        firstname,
        email,
        phone,
        surl: this.config.surl, // success redirect (server route)
        furl: this.config.furl, // failure redirect (server route)
        hash,
      },
    };
  }

  /**
   * Called from your /payu/success or /payu/failure route (PayU POSTs form data back).
   * Reverse hash sequence: SALT|status|||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
   */
  async verifyPayment(responseData) {
    const {
      status, txnid, amount, productinfo, firstname, email,
      udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '', hash: receivedHash,
    } = responseData;

    const { merchantKey, merchantSalt } = this.config;
    const reverseHashString = `${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
    const expectedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

    return {
      success: expectedHash === receivedHash && status === 'success',
      status,
      gateway: 'payu',
      orderId: txnid,
      raw: responseData,
    };
  }

  // PayU sends the same signed POST to your success/failure URL — treat that as the "webhook".
  async handleWebhook(payload) {
    return this.verifyPayment(payload);
  }

  async refund({ txnid, amount }) {
    // PayU refunds go through their "Cancel/Refund" REST API which needs a separate
    // auth header (hash of key|command|var1|salt). Left as a stub — wire this up
    // once you have live merchant refund access, docs: https://devguide.payu.in/
    throw new Error('PayU refund: implement with PayU Refund API when you have live credentials');
  }
}

module.exports = PayuProvider;
