const express = require('express');
const paymentRoutes = require('./routes/payment.routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

/**
 * IMPORTANT: Stripe & Razorpay webhook signature verification needs the
 * RAW (un-parsed) request body. So we capture rawBody ONLY for webhook
 * routes, before the global json() parser runs.
 */
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body; // Buffer
  next();
});
app.use('/api/payments/razorpay/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body; // Buffer
  next();
});

// Normal JSON parsing for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for PayU/Paytm form POST callbacks

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
