const TransactionModel = require('../models/mongo/Transaction.schema');

/**
 * MongoDB implementation of the Transaction repository.
 * Every repository (mongo/mysql/postgres) exposes the SAME 4 methods,
 * so services/controllers never know or care which DB is behind this.
 */
module.exports = {
  async save(data) {
    return TransactionModel.create({
      gateway: data.gateway,
      orderId: data.orderId,
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      status: data.status || 'created',
      customer: data.customer,
      raw: data.raw,
    });
  },

  async findByOrderId(orderId) {
    return TransactionModel.findOne({ orderId }).lean();
  },

  async updateStatus(orderId, status, extra = {}) {
    return TransactionModel.findOneAndUpdate(
      { orderId },
      { status, ...extra },
      { new: true }
    ).lean();
  },

  async findAll() {
    return TransactionModel.find().sort({ createdAt: -1 }).lean();
  },
};
