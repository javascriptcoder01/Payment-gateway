const Transaction = require('../models/sql/Transaction.model');

/**
 * SQL implementation of the Transaction repository (MySQL or Postgres —
 * whichever DB_DRIVER + sequelize.js dialect is set to). Same 4-method
 * contract as the Mongo repository, so nothing else in the app changes.
 */
module.exports = {
  async save(data) {
    return Transaction.create({
      gateway: data.gateway,
      orderId: data.orderId,
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      status: data.status || 'created',
      customerName: data.customer?.name,
      customerEmail: data.customer?.email,
      customerPhone: data.customer?.phone,
      raw: data.raw,
    });
  },

  async findByOrderId(orderId) {
    return Transaction.findOne({ where: { orderId } });
  },

  async updateStatus(orderId, status, extra = {}) {
    await Transaction.update({ status, ...extra }, { where: { orderId } });
    return Transaction.findOne({ where: { orderId } });
  },

  async findAll() {
    return Transaction.findAll({ order: [['createdAt', 'DESC']] });
  },
};
