
//  * ============================================================
//  * TRANSACTION MODEL / REPOSITORY
//  * ============================================================
//  * Right now this is a simple in-memory store so the whole
//  * project runs with ZERO database setup (great for demo/testing).
//  *
//  * When you're ready to plug in a real DB, you only need to
//  * rewrite the methods below (save/findByOrderId/updateStatus) —
//  * nothing in services/controllers/routes changes, because they
//  * only ever call this repository's methods.
//  *
//  * --- MONGOOSE VERSION (uncomment & npm i mongoose when ready) ---

const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  gateway: { type: String, required: true },
  orderId: { type: String, required: true, index: true },
  paymentId: String,
  amount: Number,
  currency: String,
  status: { type: String, default: 'created' }, // created | success | failed | refunded
  customer: { name: String, email: String, phone: String },
  raw: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
const TransactionModel = mongoose.model('Transaction', transactionSchema);

module.exports = {
  save: (data) => TransactionModel.create(data),
  findByOrderId: (orderId) => TransactionModel.findOne({ orderId }),
  updateStatus: (orderId, status, extra = {}) =>
    TransactionModel.findOneAndUpdate({ orderId }, { status, ...extra }, { new: true }),
  findAll: () => TransactionModel.find().sort({ createdAt: -1 }),
};


// const store = new Map(); // orderId -> transaction record

// module.exports = {
//   save(data) {
//     const record = {
//       ...data,
//       status: data.status || 'created',
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };
//     store.set(data.orderId, record);
//     return record;
//   },

//   findByOrderId(orderId) {
//     return store.get(orderId) || null;
//   },

//   updateStatus(orderId, status, extra = {}) {
//     const existing = store.get(orderId);
//     if (!existing) return null;
//     const updated = { ...existing, ...extra, status, updatedAt: new Date() };
//     store.set(orderId, updated);
//     return updated;
//   },

//   findAll() {
//     return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
//   },
// };
