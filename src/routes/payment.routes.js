const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Utility
router.get('/gateways', paymentController.listGateways);
router.get('/transactions', paymentController.getAllTransactions);
router.get('/transaction/:orderId', paymentController.getTransaction);

// Generic — works for stripe | razorpay | paypal (gateway in URL param)
router.post('/:gateway/create-order', paymentController.createOrder);
router.post('/:gateway/verify', paymentController.verifyPayment);
router.post('/:gateway/webhook', paymentController.webhook);
router.post('/:gateway/refund', paymentController.refund);

// Gateway-specific redirect/callback routes (form POST back from gateway, not JSON APIs)
router.post('/payu/success', paymentController.payuCallback);
router.post('/payu/failure', paymentController.payuCallback);
router.post('/paytm/callback', paymentController.paytmCallback);
router.post('/phonepe/callback', paymentController.phonepeCallback);

module.exports = router;
