import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Droplet,
  Activity,
  AlertTriangle,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';

import { useEffect, useMemo, useState } from 'react';
import { Reveal } from '@/lib/animations';
import { supabase } from '@/lib/supabase';
import { convertTransactions, getPreferredCurrency, type SupportedCurrency } from '@/lib/currency';
import {
  isFixedTransaction,
  isVariableTransaction,
} from '@/lib/financial';
import {
  MonthSelector,
  type SelectedPeriod,
} from '@/components/MonthSelector';

// Stable, high-contrast colors for categories. The color is derived from
// the category name, so the same category keeps the same color even when
// sorting/order changes or new transactions are added.
const CATEGORY_HUES = [
  156, // emerald
  205, // blue
  270, // purple
  32,  // orange
  335, // pink
  190, // cyan
  48,  // yellow
  115, // lime
  12,  // red-orange
  285, // violet
  175, // teal
  225, // indigo
  70,  // yellow-green
  355, // red
  250, // blue-violet
  95,  // green
];

function getCategoryColor(category: string): string {
  const safeCategory = String(category || 'Other');
  let hash = 0;

  for (let index = 0; index < safeCategory.length; index += 1) {
    hash = (hash * 31 + safeCategory.charCodeAt(index)) >>> 0;
  }

  const hue = CATEGORY_HUES[hash % CATEGORY_HUES.length];
  return `hsl(${hue} 78% 56%)`;
}

type Transaction = {
  _id?: string;
  id?: string;
  userId?: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  expenseType?: 'fixed' | 'variable' | string;
  isFixed?: boolean;
  description?: string;
  merchant?: string;
  date?: string;
  currency?: string;
};

type CategoryBreakdown = {
  category: string;
  total: number;
  percentage: number;
};

type InsightItem = {
  type: 'positive' | 'warning' | 'danger';
  title: string;
  detail: string;
};

export function InsightsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>('INR');
  const currencySymbol = displayCurrency === 'USD' ? '$' : displayCurrency === 'EUR' ? '€' : displayCurrency === 'GBP' ? '£' : '₹';
  const [showCategoryAnalysis, setShowCategoryAnalysis] =
    useState(false);

  const [selectedPeriod, setSelectedPeriod] =
    useState<SelectedPeriod>(() => {
      try {
        const saved = localStorage.getItem(
          'finpilot_selected_period'
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (parsed?.type === 'all') {
            return { type: 'all' };
          }

          if (
            parsed?.type === 'month' &&
            typeof parsed.year === 'number' &&
            typeof parsed.month === 'number'
          ) {
            return {
              type: 'month',
              year: parsed.year,
              month: parsed.month,
            };
          }
        }
      } catch {
        // Ignore invalid saved period
      }

      const now = new Date();

      return {
        type: 'month',
        year: now.getFullYear(),
        month: now.getMonth(),
      };
    });

  /* ============================================================
     SAVE SELECTED PERIOD
  ============================================================ */

  useEffect(() => {
    localStorage.setItem(
      'finpilot_selected_period',
      JSON.stringify(selectedPeriod)
    );
  }, [selectedPeriod]);

  /* ============================================================
     LOAD TRANSACTIONS
  ============================================================ */

  useEffect(() => {
    async function loadTransactions() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('User is not logged in');
        }

        const response = await fetch(
          `https://finpilot-backend-23iz.onrender.com/api/transactions?userId=${encodeURIComponent(
            user.id
          )}`
        );

        if (!response.ok) {
          throw new Error(
            `Transaction API returned ${response.status}`
          );
        }

        const data = await response.json();

        const preferredCurrency = getPreferredCurrency(user.id);
        setDisplayCurrency(preferredCurrency);
        const converted = await convertTransactions(
          (Array.isArray(data) ? data : []) as Transaction[],
          preferredCurrency
        );
        if (!converted) throw new Error('Exchange rates unavailable; cannot calculate mixed-currency insights.');
        setTransactions(converted as Transaction[]);
      } catch (error) {
        console.error(
          'Error loading insights transactions:',
          error
        );

        setTransactions([]);
      }
    }

    loadTransactions();
  }, []);

  /* ============================================================
     SELECTED PERIOD
  ============================================================ */

  const periodTransactions = useMemo(() => {
    if (selectedPeriod.type === 'all') {
      return transactions;
    }

    return transactions.filter((transaction) => {
      if (!transaction.date) {
        return false;
      }

      const date = new Date(transaction.date);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return (
        date.getFullYear() === selectedPeriod.year &&
        date.getMonth() === selectedPeriod.month
      );
    });
  }, [transactions, selectedPeriod]);

  /* ============================================================
     BASIC TRANSACTION GROUPS
  ============================================================ */

  const expenses = useMemo(
    () =>
      periodTransactions.filter(
        (transaction) =>
          transaction.type === 'expense'
      ),
    [periodTransactions]
  );

  const incomes = useMemo(
    () =>
      periodTransactions.filter(
        (transaction) =>
          transaction.type === 'income'
      ),
    [periodTransactions]
  );

  /* ============================================================
     TOTALS
  ============================================================ */

  const totalExpense = useMemo(
    () =>
      expenses.reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      ),
    [expenses]
  );

  const totalIncome = useMemo(
    () =>
      incomes.reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      ),
    [incomes]
  );

  /* ============================================================
     FIXED VS VARIABLE

     FIXED:
     - Rent
     - Mess
     - EMI
     - Loan
     - Other unavoidable commitments

     VARIABLE:
     - Shopping
     - Food outside mess
     - Entertainment
     - Personal spending
     - Other discretionary expenses

     Transactions without a fixed marker are treated
     as VARIABLE so existing data continues to work.
  ============================================================ */

  const fixedExpenses = useMemo(
    () =>
      expenses.filter((transaction) => isFixedTransaction(transaction)),
    [expenses]
  );

  const variableExpenses = useMemo(
    () =>
      expenses.filter((transaction) => isVariableTransaction(transaction)),
    [expenses]
  );

  const totalFixedExpense = useMemo(
    () =>
      fixedExpenses.reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      ),
    [fixedExpenses]
  );

  const totalVariableExpense = useMemo(
    () =>
      variableExpenses.reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      ),
    [variableExpenses]
  );

  /* ============================================================
     CATEGORY BREAKDOWN

     IMPORTANT:
     FIXED EXPENSES ARE COMPLETELY EXCLUDED.
  ============================================================ */

  const categoryBreakdown = useMemo<CategoryBreakdown[]>(() => {
    const categoryMap: Record<string, number> = {};

    variableExpenses.forEach((transaction) => {
      const category =
        transaction.category || 'Other';

      categoryMap[category] =
        (categoryMap[category] || 0) +
        Number(transaction.amount || 0);
    });

    return Object.entries(categoryMap)
      .map(([category, total]) => ({
        category,
        total,
        percentage:
          totalVariableExpense > 0
            ? Math.round(
                (total / totalVariableExpense) * 100
              )
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [variableExpenses, totalVariableExpense]);

  const topCategory =
    categoryBreakdown.length > 0
      ? categoryBreakdown[0]
      : null;

  /* ============================================================
     DAILY VARIABLE SPENDING

     FIXED EXPENSES NEVER ENTER THIS CALCULATION.
  ============================================================ */

  const dailySpendingTrend = useMemo(() => {
    const dailyMap: Record<string, number> = {};

    variableExpenses.forEach((transaction) => {
      if (!transaction.date) {
        return;
      }

      const date = new Date(transaction.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const day = date.getDate().toString();

      dailyMap[day] =
        (dailyMap[day] || 0) +
        Number(transaction.amount || 0);
    });

    return Object.entries(dailyMap)
      .map(([day, amount]) => ({
        day,
        amount,
      }))
      .sort(
        (a, b) =>
          Number(a.day) - Number(b.day)
      );
  }, [variableExpenses]);

  /* ============================================================
     AVERAGE PER DAY

     Only variable spending.

     Example:
     Rent = ₹4,000 fixed
     Mess = ₹3,200 fixed
     Shopping = ₹1,000 variable

     Average/day is based on ₹1,000 only.
  ============================================================ */

  const avgPerDay = useMemo(() => {
    if (totalVariableExpense <= 0) {
      return 0;
    }

    if (selectedPeriod.type === 'month') {
      const daysInMonth = new Date(
        selectedPeriod.year,
        selectedPeriod.month + 1,
        0
      ).getDate();

      const today = new Date();
      const isCurrentMonth =
        today.getFullYear() === selectedPeriod.year &&
        today.getMonth() === selectedPeriod.month;

      const daysElapsed = isCurrentMonth
        ? Math.min(today.getDate(), daysInMonth)
        : daysInMonth;

      return Math.round(
        totalVariableExpense / Math.max(1, daysElapsed)
      );
    }

    // For all-time mode, average only across calendar days on which
    // variable transactions exist. Fixed expenses never enter this value.
    const variableDates = new Set(
      variableExpenses
        .filter((transaction) => Boolean(transaction.date))
        .map((transaction) => {
          const date = new Date(transaction.date as string);
          return Number.isNaN(date.getTime())
            ? null
            : date.toISOString().split('T')[0];
        })
        .filter((date): date is string => Boolean(date))
    );

    return Math.round(
      totalVariableExpense /
        Math.max(1, variableDates.size)
    );
  }, [
    totalVariableExpense,
    variableExpenses,
    selectedPeriod,
  ]);

  /* ============================================================
     MONTHLY COMPARISON

     This chart is intentionally based on actual cash flow,
     because it shows real income vs real expenses.

     Fixed expenses are real expenses here.
  ============================================================ */

  const monthlyComparison = useMemo(() => {
    const monthlyMap: Record<
      string,
      {
        income: number;
        expense: number;
      }
    > = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) {
        return;
      }

      const date = new Date(transaction.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      const monthLabel = date.toLocaleString(
        'en-IN',
        {
          month: 'short',
        }
      );

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          income: 0,
          expense: 0,
        };
      }

      if (transaction.type === 'income') {
        monthlyMap[monthKey].income +=
          Number(transaction.amount || 0);
      } else {
        monthlyMap[monthKey].expense +=
          Number(transaction.amount || 0);
      }

      void monthLabel;
    });

    return Object.entries(monthlyMap)
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .map(([key, data]) => {
        const [year, month] =
          key.split('-').map(Number);

        const date = new Date(
          year,
          month,
          1
        );

        return {
          month: date.toLocaleString(
            'en-IN',
            {
              month: 'short',
            }
          ),
          ...data,
        };
      });
  }, [transactions]);

  /* ============================================================
     SMART REDUCTION
  ============================================================ */

  function getRecommendedReduction(
    total: number,
    transactionCount: number,
    variableExpenseTotal: number
  ) {
    if (
      total <= 0 ||
      variableExpenseTotal <= 0
    ) {
      return 0;
    }

    const spendingShare =
      total / variableExpenseTotal;

    const shareScore =
      spendingShare * 100;

    const frequencyScore = Math.min(
      transactionCount * 2,
      20
    );

    const analysisScore =
      shareScore + frequencyScore;

    if (analysisScore >= 50) {
      return 25;
    }

    if (analysisScore >= 35) {
      return 20;
    }

    if (analysisScore >= 20) {
      return 15;
    }

    if (analysisScore >= 10) {
      return 10;
    }

    return 5;
  }

  /* ============================================================
     MONEY LEAKS

     ONLY VARIABLE EXPENSES.
  ============================================================ */

  const moneyLeaks = useMemo(() => {
    return categoryBreakdown
      .slice(0, 3)
      .map((category) => {
        const categoryTransactions =
          variableExpenses.filter(
            (transaction) =>
              (transaction.category ||
                'Other') ===
              category.category
          );

        const reductionPercent =
          getRecommendedReduction(
            category.total,
            categoryTransactions.length,
            totalVariableExpense
          );

        return {
          count:
            categoryTransactions.length,
          category: category.category,
          total: category.total,
          average: Math.round(
            category.total /
              Math.max(
                1,
                categoryTransactions.length
              )
          ),
          reductionPercent,
          potentialSavings: Math.round(
            (category.total *
              reductionPercent) /
              100
          ),
        };
      });
  }, [
    categoryBreakdown,
    variableExpenses,
    totalVariableExpense,
  ]);

  /* ============================================================
     SAVING SUGGESTIONS

     ONLY VARIABLE EXPENSES.
  ============================================================ */

  const savingSuggestions = useMemo(() => {
    return categoryBreakdown
      .slice(0, 3)
      .map((category) => {
        const categoryTransactions =
          variableExpenses.filter(
            (transaction) =>
              (transaction.category ||
                'Other') ===
              category.category
          );

        const reductionPercent =
          getRecommendedReduction(
            category.total,
            categoryTransactions.length,
            totalVariableExpense
          );

        const potentialSavings =
          Math.round(
            (category.total *
              reductionPercent) /
              100
          );

        return {
          category:
            category.category,
          reductionPercent,
          potentialSavings,
          advice:
            `Based on your variable spending pattern, reducing ${category.category} spending by ${reductionPercent}% could save approximately ${currencySymbol}${potentialSavings} per month.`,
        };
      });
  }, [
    categoryBreakdown,
    variableExpenses,
    totalVariableExpense,
  ]);

  /* ============================================================
     INSIGHTS

     FIXED EXPENSES ARE NOT USED.
  ============================================================ */

  const insights = useMemo<InsightItem[]>(() => {
    if (!topCategory) {
      return [];
    }

    return [
      {
        type: 'warning',
        title:
          `${topCategory.category} is your top spending category`,
        detail:
          `${topCategory.category} accounts for ${topCategory.percentage}% of your variable expenses.`,
      },
      {
        type: 'positive',
        title:
          'Keep tracking your expenses',
        detail:
          `You have logged ${periodTransactions.length} transactions. Fixed commitments are excluded from spending-behavior analysis.`,
      },
    ];
  }, [
    topCategory,
    periodTransactions.length,
  ]);

  /* ============================================================
     FINANCIAL HEALTH

     IMPORTANT:

     Health is based on DISCRETIONARY / VARIABLE spending.

     Fixed commitments are shown separately and do not
     reduce the insight score.

     This prevents:
       Rent ₹4,000
       Mess ₹3,200

     from making the user's personal-spending health look
     artificially bad.
  ============================================================ */

  const discretionaryRemaining =
    Math.max(
      0,
      totalIncome - totalVariableExpense
    );

  const savingsRate =
    totalIncome > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (discretionaryRemaining /
                totalIncome) *
                100
            )
          )
        )
      : 0;

  const budgetControl =
    totalIncome > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (1 -
                totalVariableExpense /
                  totalIncome) *
                100
            )
          )
        )
      : 0;

  /* ============================================================
     SPENDING BEHAVIOR

     ONLY VARIABLE EXPENSES.
  ============================================================ */

  const behaviorTransactions =
    variableExpenses.filter(
      (transaction) =>
        Number(transaction.amount || 0) > 0 &&
        Boolean(transaction.date)
    );

  let spendingBehavior = 0;

  if (behaviorTransactions.length > 0) {
    /* ----------------------------------------------------------
       1. CONSISTENCY
    ---------------------------------------------------------- */

    const dailySpending: Record<
      string,
      number
    > = {};

    behaviorTransactions.forEach(
      (transaction) => {
        if (!transaction.date) {
          return;
        }

        const date = new Date(
          transaction.date
        );

        if (Number.isNaN(date.getTime())) {
          return;
        }

        const dayKey = date
          .toISOString()
          .split('T')[0];

        dailySpending[dayKey] =
          (dailySpending[dayKey] || 0) +
          Number(
            transaction.amount || 0
          );
      }
    );

    const dailyAmounts =
      Object.values(dailySpending);

    let consistencyScore = 50;

    if (dailyAmounts.length >= 2) {
      const average =
        dailyAmounts.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / dailyAmounts.length;

      const variance =
        dailyAmounts.reduce(
          (sum, value) =>
            sum +
            Math.pow(
              value - average,
              2
            ),
          0
        ) / dailyAmounts.length;

      const standardDeviation =
        Math.sqrt(variance);

      const coefficient =
        average > 0
          ? standardDeviation /
            average
          : 0;

      consistencyScore =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              100 -
                coefficient * 50
            )
          )
        );
    }

    /* ----------------------------------------------------------
       2. SPENDING TREND
    ---------------------------------------------------------- */

    const sortedExpenses = [
      ...behaviorTransactions,
    ].sort((a, b) => {
      const dateA = a.date
        ? new Date(
            a.date
          ).getTime()
        : 0;

      const dateB = b.date
        ? new Date(
            b.date
          ).getTime()
        : 0;

      return dateA - dateB;
    });

    let trendScore = 50;

    if (sortedExpenses.length >= 4) {
      const midpoint =
        Math.floor(
          sortedExpenses.length / 2
        );

      const earlierExpenses =
        sortedExpenses.slice(
          0,
          midpoint
        );

      const recentExpenses =
        sortedExpenses.slice(midpoint);

      const earlierTotal =
        earlierExpenses.reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );

      const recentTotal =
        recentExpenses.reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );

      const earlierAverage =
        earlierTotal /
        Math.max(
          1,
          earlierExpenses.length
        );

      const recentAverage =
        recentTotal /
        Math.max(
          1,
          recentExpenses.length
        );

      if (earlierAverage > 0) {
        const change =
          ((recentAverage -
            earlierAverage) /
            earlierAverage) *
          100;

        trendScore =
          Math.max(
            0,
            Math.min(
              100,
              Math.round(
                70 -
                  change * 0.5
              )
            )
          );
      }
    }

    /* ----------------------------------------------------------
       3. LARGE SPENDING
    ---------------------------------------------------------- */

    const amounts =
      behaviorTransactions
        .map((transaction) =>
          Number(
            transaction.amount || 0
          )
        )
        .filter((amount) => amount > 0)
        .sort(
          (a, b) => a - b
        );

    let largeSpendingScore = 50;

    if (amounts.length > 0) {
      const median =
        amounts.length % 2 === 0
          ? (
              amounts[
                amounts.length / 2 - 1
              ] +
              amounts[
                amounts.length / 2
              ]
            ) / 2
          : amounts[
              Math.floor(
                amounts.length / 2
              )
            ];

      const largeTransactions =
        median > 0
          ? amounts.filter(
              (amount) =>
                amount >
                median * 3
            ).length
          : 0;

      const largeTransactionRatio =
        largeTransactions /
        Math.max(
          1,
          amounts.length
        );

      largeSpendingScore =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              100 -
                largeTransactionRatio *
                  100
            )
          )
        );
    }

    /* ----------------------------------------------------------
       FINAL SCORE
    ---------------------------------------------------------- */

    spendingBehavior =
      Math.round(
        consistencyScore * 0.4 +
          trendScore * 0.35 +
          largeSpendingScore * 0.25
      );

    spendingBehavior =
      Math.max(
        0,
        Math.min(
          100,
          spendingBehavior
        )
      );
  }

  /* ============================================================
     FINAL HEALTH SCORE
  ============================================================ */

  const healthScore =
    Math.round(
      (
        savingsRate +
        budgetControl +
        spendingBehavior
      ) / 3
    );

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <Reveal>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Insights
            </h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Deep analysis of your spending behavior
            </p>
          </div>

          <MonthSelector
            value={selectedPeriod}
            onChange={setSelectedPeriod}
          />
        </div>
      </Reveal>

      {/* SPENDING OVERVIEW */}

      <Reveal delay={50}>
        <div className="glass-card p-5">
          <span className="metric-label">
            Spending Overview
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">

            <StatBox
              label={
                selectedPeriod.type === 'all'
                  ? 'All Time Expense'
                  : 'Selected Month'
              }
              value={`${currencySymbol}${totalExpense.toLocaleString(
                'en-IN'
              )}`}
            />

            <StatBox
              label="Variable Spend"
              value={`${currencySymbol}${totalVariableExpense.toLocaleString(
                'en-IN'
              )}`}
            />

            <StatBox
              label="Avg / Day"
              value={`${currencySymbol}${avgPerDay.toLocaleString(
                'en-IN'
              )}`}
            />

            <StatBox
              label="Top Category"
              value={
                topCategory?.category ||
                'N/A'
              }
              change={
                topCategory
                  ? `${topCategory.percentage}%`
                  : ''
              }
              trend="up"
            />

          </div>

          {/* FIXED EXPENSE INFO */}

          {totalFixedExpense > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">

              <div>
                <p className="text-xs text-gray-500">
                  Fixed commitments
                </p>

                <p className="text-sm font-semibold text-white mt-0.5">
                  {currencySymbol}
                  {totalFixedExpense.toLocaleString(
                    'en-IN'
                  )}
                </p>
              </div>

              <p className="text-xs text-gray-500 text-right">
                Excluded from personal spending insights
              </p>

            </div>
          )}
        </div>
      </Reveal>

      {/* MONTHLY COMPARISON */}

      <Reveal delay={100}>
        <div className="glass-card p-5">

          <span className="metric-label">
            Monthly Comparison
          </span>

          {monthlyComparison.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No monthly transaction data available.
              </p>
            </div>
          ) : (
            <div
              className="monthly-comparison-chart"
              style={{ userSelect: 'none' }}
            >
              <ResponsiveContainer
                width="100%"
                height={220}
              >
                <BarChart
                  data={monthlyComparison}
                  barGap={8}
                  style={{ userSelect: 'none' }}
                >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#111412"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 12,
                    fill: '#4B5563',
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 12,
                    fill: '#4B5563',
                  }}
                />

                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: '#0C0F0D',
                    border:
                      '1px solid #1a1f1c',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />

                  <Bar
                    dataKey="income"
                    fill="#00FF88"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                    opacity={0.4}
                    activeBar={{
                      fill: '#00FF88',
                      opacity: 0.75,
                    }}
                  />

                  <Bar
                    dataKey="expense"
                    fill="#00D97E"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                    activeBar={{
                      fill: '#00FF88',
                      opacity: 1,
                    }}
                  />

                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-[10px] text-gray-600 mt-2">
            Monthly comparison shows actual cash flow,
            including fixed commitments.
          </p>

        </div>
      </Reveal>

      {/* CATEGORY ANALYSIS */}

      <Reveal delay={150}>
        <div className="glass-card p-5">

          <div className="flex items-center justify-between mb-4">

            <span className="metric-label">
              {showCategoryAnalysis
                ? 'Category Analysis'
                : 'Breakdown by Amount'}
            </span>

            <button
              type="button"
              onClick={() =>
                setShowCategoryAnalysis(
                  (value) => !value
                )
              }
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {showCategoryAnalysis
                ? 'View Breakdown'
                : 'View Category Analysis'}
            </button>

          </div>

          {categoryBreakdown.length === 0 ? (

            <div className="py-8 text-center">

              <p className="text-sm text-gray-500">
                No variable spending data available
                for this period.
              </p>

              {totalFixedExpense > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Fixed commitments are excluded
                  from this analysis.
                </p>
              )}

            </div>

          ) : showCategoryAnalysis ? (

            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <PieChart>

                <Pie
                  data={categoryBreakdown.filter((item) => Number(item.total) > 0)}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {categoryBreakdown.filter((item) => Number(item.total) > 0).map(
                    (category, index) => (
                      <Cell
                        key={category.category || index}
                        fill={getCategoryColor(
                          category.category
                        )}
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: '#0C0F0D',
                    border:
                      '1px solid #1a1f1c',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />

              </PieChart>
            </ResponsiveContainer>

          ) : (

            <div className="space-y-3">

              {categoryBreakdown.map(
                (category, index) => (
                  <div
                    key={category.category}
                  >

                    <div className="flex items-center justify-between mb-1">

                      <div className="flex items-center gap-2">

                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            background:
                              getCategoryColor(
                                category.category
                              ),
                          }}
                        />

                        <span className="text-sm text-gray-200">
                          {category.category}
                        </span>

                        {category.percentage >
                          40 && (
                          <span className="text-[10px] text-amber-400 font-medium">
                            High concentration
                          </span>
                        )}

                      </div>

                      <span className="text-xs text-gray-400">
                        {currencySymbol}
                        {category.total.toLocaleString(
                          'en-IN'
                        )}{' '}
                        · {category.percentage}%
                      </span>

                    </div>

                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">

                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${category.percentage}%`,
                          background:
                            getCategoryColor(
                              category.category
                            ),
                        }}
                      />

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      </Reveal>

      {/* BEHAVIOR TREND */}

      <Reveal delay={200}>
        <div className="glass-card p-5">

          <span className="metric-label">
            Behavior Trends
          </span>

          <p className="text-xs text-gray-600 mt-1 mb-3">
            Variable spending only — fixed commitments excluded
          </p>

          {dailySpendingTrend.length === 0 ? (

            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No variable spending data available.
              </p>
            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={200}
            >
              <AreaChart
                data={dailySpendingTrend}
              >

                <defs>
                  <linearGradient
                    id="insightTrend"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#00FF88"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="100%"
                      stopColor="#00FF88"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#111412"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 10,
                    fill: '#4B5563',
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: '#4B5563',
                  }}
                />

                <Tooltip
                  contentStyle={{
                    background: '#0C0F0D',
                    border:
                      '1px solid #1a1f1c',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#00FF88"
                  strokeWidth={2}
                  fill="url(#insightTrend)"
                />

              </AreaChart>
            </ResponsiveContainer>

          )}

        </div>
      </Reveal>

      {/* FINANCIAL HEALTH */}

      <Reveal delay={250}>
        <div className="glass-card p-5">

          <div className="flex items-center justify-between mb-4">

            <span className="metric-label">
              Financial Health Score
            </span>

            <Activity className="w-4 h-4 text-emerald-400/50" />

          </div>

          <div className="flex items-center gap-6">

            <div className="relative">

              <ResponsiveContainer
                width={120}
                height={120}
              >
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[
                    {
                      value: healthScore,
                      fill: '#00FF88',
                    },
                  ]}
                  startAngle={90}
                  endAngle={-270}
                >

                  <RadialBar
                    background={{
                      fill: '#111412',
                    }}
                    dataKey="value"
                    cornerRadius={10}
                  />

                </RadialBarChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">

                <span className="text-2xl font-bold text-white">
                  {healthScore}
                </span>

                <span className="text-[10px] text-gray-500">
                  / 100
                </span>

              </div>

            </div>

            <div className="flex-1 space-y-3">

              <HealthRow
                label="Variable Savings Rate"
                value={savingsRate}
                status={
                  savingsRate >= 50
                    ? 'GOOD'
                    : savingsRate >= 20
                    ? 'MODERATE'
                    : 'LOW'
                }
              />

              <HealthRow
                label="Variable Budget Control"
                value={budgetControl}
                status={
                  budgetControl >= 60
                    ? 'GOOD'
                    : budgetControl >= 30
                    ? 'MODERATE'
                    : 'LOW'
                }
              />

              <HealthRow
                label="Spending Behavior"
                value={spendingBehavior}
                status={
                  spendingBehavior >= 70
                    ? 'GOOD'
                    : spendingBehavior >= 40
                    ? 'MODERATE'
                    : 'LOW'
                }
              />

            </div>

          </div>

          {totalFixedExpense > 0 && (
            <p className="text-[10px] text-gray-600 mt-4">
              Financial health focuses on discretionary
              spending. Fixed commitments are tracked
              separately.
            </p>
          )}

        </div>
      </Reveal>

      {/* MONEY LEAKS */}

      <Reveal delay={300}>
        <div className="glass-card p-5">

          <div className="flex items-center justify-between mb-4">

            <span className="metric-label">
              Money Leaks
            </span>

            <Droplet className="w-4 h-4 text-emerald-400/50" />

          </div>

          {moneyLeaks.length === 0 ? (

            <p className="text-sm text-gray-500 text-center py-6">
              No variable spending leaks detected.
            </p>

          ) : (

            <div className="space-y-3">

              {moneyLeaks.map(
                (leak, index) => (
                  <div
                    key={`${leak.category}-${index}`}
                    className="bg-emerald-400/[0.04] border border-emerald-400/10 rounded-xl p-4"
                  >

                    <div className="flex items-start gap-3">

                      <Droplet className="w-4 h-4 text-emerald-400 mt-0.5" />

                      <div className="flex-1">

                        <p className="text-sm text-gray-100">
                          {leak.count}{' '}
                          {leak.category}{' '}
                          purchases
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          Total: {currencySymbol}
                          {leak.total.toLocaleString(
                            'en-IN'
                          )}{' '}
                          · Average: {currencySymbol}
                          {leak.average.toLocaleString(
                            'en-IN'
                          )}{' '}
                          per transaction
                        </p>

                        <p className="text-xs text-emerald-400 mt-1.5">
                          Reduce by{' '}
                          {leak.reductionPercent}
                          % to save {currencySymbol}
                          {leak.potentialSavings.toLocaleString(
                            'en-IN'
                          )}
                        </p>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      </Reveal>

      {/* SAVING SUGGESTIONS */}

      <Reveal delay={350}>
        <div className="glass-card p-5">

          <div className="flex items-center justify-between mb-4">

            <span className="metric-label">
              Smart Saving Suggestions
            </span>

            <Lightbulb className="w-4 h-4 text-amber-400/50" />

          </div>

          {savingSuggestions.length === 0 ? (

            <p className="text-sm text-gray-500 text-center py-6">
              No variable spending suggestions available.
            </p>

          ) : (

            <div className="space-y-3">

              {savingSuggestions.map(
                (suggestion) => (
                  <div
                    key={suggestion.category}
                    className="border border-white/[0.06] rounded-xl p-4"
                  >

                    <div className="flex items-center justify-between mb-2">

                      <span className="text-sm font-medium text-white">
                        {suggestion.category}
                      </span>

                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                        Save Up To{' '}
                        {suggestion.potentialSavings.toLocaleString(
                          'en-IN'
                        )}
                        /mo
                      </span>

                    </div>

                    <p className="text-xs text-gray-400">
                      {suggestion.advice}
                    </p>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      </Reveal>

      {/* ALL INSIGHTS */}

      <Reveal delay={400}>
        <div className="glass-card p-5">

          <span className="metric-label">
            All Insights
          </span>

          <div className="space-y-3 mt-3">

            {insights.length === 0 ? (

              <p className="text-sm text-gray-500 text-center py-6">
                Add some variable expenses to generate insights.
              </p>

            ) : (

              insights.map(
                (insight, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-3 border ${
                      insight.type === 'positive'
                        ? 'bg-emerald-400/[0.04] border-emerald-400/10'
                        : insight.type === 'warning'
                        ? 'bg-amber-400/[0.04] border-amber-400/10'
                        : 'bg-red-400/[0.04] border-red-400/10'
                    }`}
                  >

                    <div className="flex items-start gap-2">

                      {insight.type === 'danger' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                      ) : insight.type === 'positive' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5" />
                      ) : (
                        <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5" />
                      )}

                      <div>

                        <p className="text-sm font-medium text-gray-100">
                          {insight.title}
                        </p>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {insight.detail}
                        </p>

                      </div>

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </div>
      </Reveal>

    </div>
  );
}

/* ============================================================
   STAT BOX
============================================================ */

function StatBox({
  label,
  value,
  change,
  trend,
}: {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-3">

      <p className="metric-label">
        {label}
      </p>

      <p className="text-lg font-bold text-white mt-1">
        {value}
      </p>

      {change && (
        <p
          className={`text-xs mt-0.5 flex items-center gap-1 ${
            trend === 'up'
              ? 'text-red-400'
              : 'text-emerald-400'
          }`}
        >
          {trend === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}

          {change}
        </p>
      )}

    </div>
  );
}

/* ============================================================
   HEALTH ROW
============================================================ */

function HealthRow({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: string;
}) {
  return (
    <div>

      <div className="flex items-center justify-between mb-1">

        <span className="text-sm text-gray-300">
          {label}
        </span>

        <span
          className={`text-[10px] font-semibold ${
            status === 'GOOD'
              ? 'text-emerald-400'
              : status === 'MODERATE'
              ? 'text-amber-400'
              : 'text-red-400'
          }`}
        >
          {status}
        </span>

      </div>

      <div className="h-2 bg-white/5 rounded-full overflow-hidden">

        <div
          className={`h-full rounded-full ${
            status === 'GOOD'
              ? 'bg-emerald-400'
              : status === 'MODERATE'
              ? 'bg-amber-400'
              : 'bg-red-400'
          }`}
          style={{
            width: `${Math.min(
              100,
              Math.max(0, value)
            )}%`,
          }}
        />

      </div>

    </div>
  );
}

export default InsightsPage;