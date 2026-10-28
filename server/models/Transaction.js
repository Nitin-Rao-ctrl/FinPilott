
const mongoose = require('mongoose');

const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      default: 'INR',
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    expenseType: {
      type: String,
      enum: ['fixed', 'variable'],
      default: 'variable',
    },
    isFixed: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
    merchant: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
