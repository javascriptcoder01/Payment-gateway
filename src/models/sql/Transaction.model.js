const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Transaction = sequelize.define(
  'Transaction',
  {
    gateway: { type: DataTypes.STRING, allowNull: false },
    orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
    paymentId: DataTypes.STRING,
    amount: DataTypes.FLOAT,
    currency: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('created', 'success', 'failed', 'refunded'),
      defaultValue: 'created',
    },
    customerName: DataTypes.STRING,
    customerEmail: DataTypes.STRING,
    customerPhone: DataTypes.STRING,
    raw: DataTypes.JSON, // JSON works on both MySQL 5.7+ and Postgres
  },
  {
    tableName: 'transactions',
    timestamps: true, // adds createdAt, updatedAt
  }
);

module.exports = Transaction;
