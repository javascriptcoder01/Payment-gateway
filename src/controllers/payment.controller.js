const paymentService = require('../services/payment.service');
const { success, error } = require('../utils/apiResponse');
const PaymentFactory = require('../factory/PaymentFactory');
const logger = require('../utils/logger');

class PaymentController {
  // GET /api/payments/gateways
  listGateways(req, res) {
    return success(res, { gateways: PaymentFactory.getSupportedGateways() });
  }

  // POST /api/payments/:gateway/create-order
  async createOrder(req, res) {
    try {
      const { gateway } = req.params;
      const result = await paymentService.createOrder(gateway, req.body);
      return success(res, result, 'Order created');
    } catch (err) {
      logger.error('createOrder error:', err.message);
      return error(res, err.message, 400);
    }
  }

  // POST /api/payments/:gateway/verify
  async verifyPayment(req, res) {
    try {
      const { gateway } = req.params;
      const result = await paymentService.verifyPayment(gateway, req.body);
      return success(res, result, result.success ? 'Payment verified' : 'Payment verification failed');
    } catch (err) {
      logger.error('verifyPayment error:', err.message);
      return error(res, err.message, 400);
    }
  }

  // POST /api/payments/:gateway/webhook  (raw body for stripe/razorpay, json for others)
  async webhook(req, res) {
    try {
      const { gateway } = req.params;
      const body = req.rawBody || req.body; // rawBody set by express.raw() middleware where needed
      const result = await paymentService.handleWebhook(gateway, body, req.headers);
      return success(res, result, 'Webhook processed');
    } catch (err) {
      logger.error('webhook error:', err.message);
      return error(res, err.message, 400);
    }
  }

  // PayU / Paytm redirect back via POST form -> handle + redirect to your frontend
  async payuCallback(req, res) {
    try {
      const result = await paymentService.verifyPayment('payu', req.body);
      const redirectTo = result.success
        ? `${process.env.FRONTEND_SUCCESS_URL || '/payment-success'}?orderId=${result.orderId}`
        : `${process.env.FRONTEND_FAILURE_URL || '/payment-failed'}?orderId=${result.orderId}`;
      return res.redirect(redirectTo);
    } catch (err) {
      logger.error('payuCallback error:', err.message);
      return res.redirect(process.env.FRONTEND_FAILURE_URL || '/payment-failed');
    }
  }

  async paytmCallback(req, res) {
    try {
      const result = await paymentService.verifyPayment('paytm', req.body);
      const redirectTo = result.success
        ? `${process.env.FRONTEND_SUCCESS_URL || '/payment-success'}?orderId=${result.orderId}`
        : `${process.env.FRONTEND_FAILURE_URL || '/payment-failed'}?orderId=${result.orderId}`;
      return res.redirect(redirectTo);
    } catch (err) {
      logger.error('paytmCallback error:', err.message);
      return res.redirect(process.env.FRONTEND_FAILURE_URL || '/payment-failed');
    }
  }

  async phonepeCallback(req, res) {
    try {
      const result = await paymentService.handleWebhook('phonepe', req.body, req.headers);
      return success(res, result);
    } catch (err) {
      logger.error('phonepeCallback error:', err.message);
      return error(res, err.message, 400);
    }
  }

  // POST /api/payments/:gateway/refund
  async refund(req, res) {
    try {
      const { gateway } = req.params;
      const result = await paymentService.refund(gateway, req.body);
      return success(res, result, result.success ? 'Refund successful' : 'Refund failed');
    } catch (err) {
      logger.error('refund error:', err.message);
      return error(res, err.message, 400);
    }
  }

  // GET /api/payments/transaction/:orderId
  getTransaction(req, res) {
    const record = paymentService.getTransaction(req.params.orderId);
    if (!record) return error(res, 'Transaction not found', 404);
    return success(res, record);
  }

  // GET /api/payments/transactions
  getAllTransactions(req, res) {
    return success(res, paymentService.getAllTransactions());
  }
}

module.exports = new PaymentController();
