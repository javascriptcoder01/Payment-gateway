/**
 * In-memory repository — zero DB setup needed. Great for quick demo/testing
 * (exactly what we used before wiring real databases). Data is lost on
 * server restart, so don't use this in production.
 */
const store = new Map(); // orderId -> transaction record

module.exports = {
  async save(data) {
    const record = {
      ...data,
      status: data.status || 'created',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.set(data.orderId, record);
    return record;
  },

  async findByOrderId(orderId) {
    return store.get(orderId) || null;
  },

  async updateStatus(orderId, status, extra = {}) {
    const existing = store.get(orderId);
    if (!existing) return null;
    const updated = { ...existing, ...extra, status, updatedAt: new Date() };
    store.set(orderId, updated);
    return updated;
  },

  async findAll() {
    return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
  },
};
