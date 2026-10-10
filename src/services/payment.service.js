const PaymentFactory = require('../factory/PaymentFactory');
const Transaction = require('../models/Transaction.model');
const logger = require('../utils/logger');

class PaymentService {
  async createOrder(gateway, orderData) {
    const provider = PaymentFactory.getProvider(gateway);
    const result = await provider.createOrder(orderData);

    Transaction.save({
      gateway,
      orderId: result.orderId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      status: 'created',
      customer: {
        name: orderData.firstname || orderData.name,
        email: orderData.email,
        phone: orderData.phone,
      },
      raw: result.raw,
    });

    logger.info(`[${gateway}] order created`, result.orderId);
    return result;
  }

  async verifyPayment(gateway, paymentData) {
    const provider = PaymentFactory.getProvider(gateway);
    const result = await provider.verifyPayment(paymentData);

    if (result.orderId) {
      Transaction.updateStatus(result.orderId, result.success ? 'success' : 'failed', {
        paymentId: result.paymentId,
        verifiedRaw: result.raw,
      });
    }

    logger.info(`[${gateway}] verify`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  }

  async handleWebhook(gateway, payload, headers) {
    const provider = PaymentFactory.getProvider(gateway);
    const result = await provider.handleWebhook(payload, headers);
    logger.info(`[${gateway}] webhook event`, result.event || result.status);
    return result;
  }

  async refund(gateway, refundData) {
    const provider = PaymentFactory.getProvider(gateway);
    const result = await provider.refund(refundData);

    if (refundData.orderId) {
      Transaction.updateStatus(refundData.orderId, 'refunded', { refundRaw: result.raw });
    }

    logger.info(`[${gateway}] refund`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  }

  getTransaction(orderId) {
    return Transaction.findByOrderId(orderId);
  }

  getAllTransactions() {
    return Transaction.findAll();
  }
}

module.exports = new PaymentService();
