export type FinancialTransaction = {
  id?: string | number;
  _id?: string;
  userId?: string;

  type?: string;
  amount?: number | string;
  category?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP' | string;

  // Supports both the current and legacy fixed-expense formats.
  expenseType?: 'fixed' | 'variable' | string;
  isFixed?: boolean;

  date?: string;
  description?: string;
  merchant?: string;
};

/**
 * Returns true when the transaction is an actual expense.
 */
export function isExpense(
  transaction: FinancialTransaction
): boolean {
  const type = String(transaction.type || '').toLowerCase();

  return (
    type === 'expense' ||
    type === 'debit' ||
    type === 'spent'
  );
}

/**
 * Returns true when the transaction is income.
 */
export function isIncome(
  transaction: FinancialTransaction
): boolean {
  return String(transaction.type || '').toLowerCase() === 'income';
}

/**
 * A transaction is FIXED when either:
 *
 *   isFixed === true
 *
 * OR:
 *
 *   expenseType === 'fixed'
 *
 * Supporting both formats prevents old/new transactions
 * from accidentally entering variable-spending analytics.
 */
export function isFixedTransaction(
  transaction: FinancialTransaction
): boolean {
  if (!isExpense(transaction)) {
    return false;
  }

  return (
    transaction.isFixed === true ||
    String(transaction.expenseType || '').toLowerCase() === 'fixed'
  );
}

/**
 * Variable = actual expense AND NOT fixed.
 *
 * This is the single source of truth for discretionary spending.
 */
export function isVariableTransaction(
  transaction: FinancialTransaction
): boolean {
  return isExpense(transaction) && !isFixedTransaction(transaction);
}

/**
 * Safely return transaction amount.
 *
 * Invalid / missing amounts are treated as zero.
 */
export function getTransactionAmount(
  transaction: FinancialTransaction
): number {
  const amount = Number(transaction.amount ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

/**
 * ============================================================
 * ACTUAL CASH FLOW
 * ============================================================
 *
 * Includes:
 *   income
 *   fixed expenses
 *   variable expenses
 *
 * Fixed expenses MUST reduce actual available balance.
 */
export function calculateActualBalance(
  transactions: FinancialTransaction[]
): number {
  return transactions.reduce((balance, transaction) => {
    const amount = getTransactionAmount(transaction);

    if (isIncome(transaction)) {
      return balance + amount;
    }

    if (isExpense(transaction)) {
      return balance - amount;
    }

    return balance;
  }, 0);
}

/**
 * Total actual expenses.
 *
 * Fixed + variable.
 *
 * Use this for:
 *   - real expense totals
 *   - actual cash-flow reporting
 *   - actual savings calculations
 *
 * Do NOT use this for discretionary spending analytics.
 */
export function calculateTotalExpenses(
  transactions: FinancialTransaction[]
): number {
  return transactions.reduce((total, transaction) => {
    if (!isExpense(transaction)) {
      return total;
    }

    return total + getTransactionAmount(transaction);
  }, 0);
}

/**
 * Total fixed expenses.
 */
export function calculateFixedExpenses(
  transactions: FinancialTransaction[]
): number {
  return transactions.reduce((total, transaction) => {
    if (!isFixedTransaction(transaction)) {
      return total;
    }

    return total + getTransactionAmount(transaction);
  }, 0);
}

/**
 * Total variable/discretionary expenses.
 */
export function calculateVariableExpenses(
  transactions: FinancialTransaction[]
): number {
  return transactions.reduce((total, transaction) => {
    if (!isVariableTransaction(transaction)) {
      return total;
    }

    return total + getTransactionAmount(transaction);
  }, 0);
}

/**
 * Return only fixed expenses.
 */
export function getFixedExpenses(
  transactions: FinancialTransaction[]
): FinancialTransaction[] {
  return transactions.filter(isFixedTransaction);
}

/**
 * Return only variable/discretionary expenses.
 */
export function getVariableExpenses(
  transactions: FinancialTransaction[]
): FinancialTransaction[] {
  return transactions.filter(isVariableTransaction);
}

/**
 * ============================================================
 * VARIABLE SPENDING AVERAGE
 * ============================================================
 *
 * Fixed expenses NEVER enter this calculation.
 *
 * Used for:
 *   - daily discretionary average
 *   - variable burn rate
 *   - run-out calculations
 *   - variable spending forecasts
 */
export function calculateAverageDailyVariableSpend(
  transactions: FinancialTransaction[],
  daysElapsed: number
): number {
  const variableExpense = calculateVariableExpenses(transactions);

  if (variableExpense <= 0 || daysElapsed <= 0) {
    return 0;
  }

  return variableExpense / daysElapsed;
}

/**
 * ============================================================
 * VARIABLE CATEGORY TOTALS
 * ============================================================
 *
 * Fixed expenses are completely excluded.
 */
export function calculateVariableCategoryTotals(
  transactions: FinancialTransaction[]
): Record<string, number> {
  const categories: Record<string, number> = {};

  transactions
    .filter(isVariableTransaction)
    .forEach((transaction) => {
      const category = transaction.category?.trim() || 'Other';

      categories[category] =
        (categories[category] || 0) +
        getTransactionAmount(transaction);
    });

  return categories;
}

/**
 * ============================================================
 * VARIABLE CATEGORY PERCENTAGES
 * ============================================================
 *
 * Percentages are based ONLY on variable/discretionary spending.
 */
export function calculateVariableCategoryPercentages(
  transactions: FinancialTransaction[]
): Record<string, number> {
  const totals = calculateVariableCategoryTotals(transactions);

  const totalVariable = Object.values(totals).reduce(
    (sum, amount) => sum + amount,
    0
  );

  if (totalVariable <= 0) {
    return Object.fromEntries(
      Object.keys(totals).map((category) => [category, 0])
    );
  }

  return Object.fromEntries(
    Object.entries(totals).map(([category, amount]) => [
      category,
      Math.round((amount / totalVariable) * 100),
    ])
  );
}

/**
 * ============================================================
 * FUTURE VARIABLE SPENDING
 * ============================================================
 *
 * Projects only variable/discretionary spending.
 * Fixed commitments are already reflected in current balance
 * and are NOT projected again here.
 */
export function calculateProjectedVariableSpend(
  transactions: FinancialTransaction[],
  daysElapsed: number,
  daysRemaining: number
): number {
  const dailyAverage = calculateAverageDailyVariableSpend(
    transactions,
    Math.max(1, daysElapsed)
  );

  return Math.round(dailyAverage * Math.max(0, daysRemaining));
}

/**
 * ============================================================
 * MONTH-END BALANCE
 * ============================================================
 *
 * Current balance includes ALL expenses already recorded,
 * including fixed expenses.
 *
 * Only future VARIABLE spending is projected.
 */
export function calculateProjectedMonthEndBalance(
  transactions: FinancialTransaction[],
  daysElapsed: number,
  daysRemaining: number
): number {
  const currentBalance = calculateActualBalance(transactions);

  const projectedVariableSpend = calculateProjectedVariableSpend(
    transactions,
    daysElapsed,
    daysRemaining
  );

  return Math.round(currentBalance - projectedVariableSpend);
}

/**
 * ============================================================
 * MONEY RUN-OUT
 * ============================================================
 *
 * Current balance = after ALL recorded expenses.
 *
 * Burn rate = VARIABLE expenses only.
 *
 * This answers:
 * "How long can the current balance support my current
 * discretionary spending pace?"
 */
export function calculateRunOutDays(
  transactions: FinancialTransaction[],
  daysElapsed: number
): number {
  const currentBalance = calculateActualBalance(transactions);

  const dailyVariableBurn = calculateAverageDailyVariableSpend(
    transactions,
    Math.max(1, daysElapsed)
  );

  if (currentBalance <= 0 || dailyVariableBurn <= 0) {
    return 0;
  }

  return Math.round((currentBalance / dailyVariableBurn) * 10) / 10;
}
