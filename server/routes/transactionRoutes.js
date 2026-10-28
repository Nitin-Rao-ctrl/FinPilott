
const express = require('express');
const Transaction = require('../models/Transaction');

const router = express.Router();
const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

function normalizeCurrency(value) {
  if (value === undefined || value === null || value === '') {
    return 'INR';
  }

  const currency = String(value).toUpperCase();

  return SUPPORTED_CURRENCIES.includes(currency)
    ? currency
    : null;
}

function getExpenseFields(type, expenseType, isFixed) {
  const fixed =
    type === 'expense' &&
    (
      isFixed === true ||
      String(expenseType || '').toLowerCase() === 'fixed'
    );

  return {
    expenseType:
      type === 'expense'
        ? fixed
          ? 'fixed'
          : 'variable'
        : 'variable',
    isFixed: type === 'expense' ? fixed : false,
  };
}

// Get transactions for a user.
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const transactions = await Transaction.find({ userId }).sort({
      date: -1,
    });

    return res.json(transactions);
  } catch (error) {
    console.error('GET transactions error:', error);
    return res.status(500).json({
      message: 'Failed to fetch transactions',
    });
  }
});

// Create transaction.
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      type,
      amount,
      category,
      expenseType,
      isFixed,
      description,
      merchant,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'type must be income or expense',
      });
    }

    if (
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 0
    ) {
      return res.status(400).json({
        message: 'amount must be a valid non-negative number',
      });
    }

    if (!category || !date) {
      return res.status(400).json({
        message: 'category and date are required',
      });
    }

    const currency = normalizeCurrency(req.body.currency);

    if (!currency) {
      return res.status(400).json({
        message: 'Unsupported currency. Use INR, USD, EUR, or GBP.',
      });
    }

    const expenseFields = getExpenseFields(
      type,
      expenseType,
      isFixed
    );

    const transaction = await Transaction.create({
      userId,
      type,
      amount: Number(amount),
      currency,
      category,
      ...expenseFields,
      description: description || '',
      merchant: merchant || '',
      date,
    });

    return res.status(201).json(transaction);
  } catch (error) {
    console.error('POST transaction error:', error);
    return res.status(400).json({ message: error.message });
  }
});

// Update transaction.
router.put('/:id', async (req, res) => {
  try {
    const {
      userId,
      type,
      amount,
      category,
      expenseType,
      isFixed,
      description,
      merchant,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'type must be income or expense',
      });
    }

    if (
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 0
    ) {
      return res.status(400).json({
        message: 'amount must be a valid non-negative number',
      });
    }

    const currency = normalizeCurrency(req.body.currency);

    if (!currency) {
      return res.status(400).json({
        message: 'Unsupported currency. Use INR, USD, EUR, or GBP.',
      });
    }

    const expenseFields = getExpenseFields(
      type,
      expenseType,
      isFixed
    );

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        $set: {
          type,
          amount: Number(amount),
          currency,
          category,
          ...expenseFields,
          description: description || '',
          merchant: merchant || '',
          date,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    return res.json(transaction);
  } catch (error) {
    console.error('UPDATE transaction error:', error);
    return res.status(400).json({ message: error.message });
  }
});

// Delete transaction.
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    return res.json({
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('DELETE transaction error:', error);
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
