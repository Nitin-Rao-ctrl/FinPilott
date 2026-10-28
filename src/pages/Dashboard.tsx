  import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Activity,
    AlertTriangle,
    Zap,

    FileText,
    Calendar,
    Check,
  } from 'lucide-react';

  import {
    AreaChart,
    Area,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    RadialBarChart,
    RadialBar,
  } from 'recharts';

  import { Link } from 'react-router-dom';
  import { useEffect, useState, type ReactNode } from 'react';

  import { CountUp, Reveal } from '@/lib/animations';
  import { supabase } from '@/lib/supabase';
  import { convertTransactions, getPreferredCurrency } from '@/lib/currency';
  import type { SelectedPeriod } from '@/components/MonthSelector';

  const PIE_COLORS = [
    '#00FF88',
    '#00D97E',
    '#10B981',
    '#059669',
    '#047857',
    '#065F46',
  ];

 type Transaction = {
  id?: string | number;
  amount?: number | string;
  type?: string;
  category?: string;
  expenseType?: 'fixed' | 'variable';
  date?: string;
  description?: string;
};

  type Insight = {
    type: 'positive' | 'warning' | 'danger';
    title: string;
    detail: string;
  };

  export function DashboardPage() {
    const [todayStatus, setTodayStatus] = useState<
      'logged' | 'zero_spend' | null
    >(null);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
const [loading, setLoading] = useState(true);
const [userName, setUserName] = useState('User');
const [displayCurrency, setDisplayCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
const [currencyError, setCurrencyError] = useState(false);
const currencySymbol = displayCurrency === 'USD' ? '$' : displayCurrency === 'EUR' ? '€' : displayCurrency === 'GBP' ? '£' : '₹';

const [selectedPeriod] =
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
      LOAD TRANSACTIONS
    ============================================================ */
useEffect(() => {
  async function loadTransactions() {
    try {
      setLoading(true);

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

      if (!converted) {
        setCurrencyError(true);
        setTransactions([]);
        return;
      }

      setCurrencyError(false);
      setTransactions(converted as Transaction[]);
    } catch (error) {
      console.error(
        'Error loading dashboard transactions:',
        error
      );

      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  loadTransactions();
}, []);

    /* ============================================================
      LOAD LOGGED-IN USER
    ============================================================ */

    useEffect(() => {
      async function loadUserName() {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.user_name ||
          user.email?.split('@')[0] ||
          'User';

        setUserName(name);
      }

      loadUserName();
    }, []);

    /* ============================================================
      BASIC TOTALS
    ============================================================ */

    /* ============================================================
  SELECTED PERIOD TRANSACTIONS
============================================================ */

const selectedTransactions =
  selectedPeriod.type === 'all'
    ? transactions
    : transactions.filter((t) => {
        if (!t.date) return false;

        const date = new Date(t.date);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        return (
          date.getMonth() === selectedPeriod.month &&
          date.getFullYear() === selectedPeriod.year
        );
      });

/* ============================================================
  BASIC TOTALS
============================================================ */

const totalIncome = selectedTransactions
  .filter((t) => t.type === 'income')
  .reduce(
    (sum, t) =>
      sum + Number(t.amount || 0),
    0
  );

const totalFixedExpense = selectedTransactions
  .filter(
    (t) =>
      t.type === 'expense' &&
      t.expenseType === 'fixed'
  )
  .reduce(
    (sum, t) =>
      sum + Number(t.amount || 0),
    0
  );

const totalVariableExpense = selectedTransactions
  .filter(
    (t) =>
      t.type === 'expense' &&
      t.expenseType !== 'fixed'
  )
  .reduce(
    (sum, t) =>
      sum + Number(t.amount || 0),
    0
  );

const totalExpense = selectedTransactions
  .filter((t) => t.type === 'expense')
  .reduce(
    (sum, t) =>
      sum + Number(t.amount || 0),
    0
  );

    const balance = totalIncome - totalExpense;

    const savings = balance;

    /* ============================================================
      CURRENT DATE
    ============================================================ */

    const today = new Date();

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const isCurrentMonth =
  selectedPeriod.type === 'month' &&
  selectedPeriod.month === currentMonth &&
  selectedPeriod.year === currentYear;

    /* ============================================================
      CURRENT MONTH TRANSACTIONS
    ============================================================ */

   const currentMonthTransactions =
  selectedTransactions.filter((t) => {
        if (!t.date) return true;

        const date = new Date(t.date);

        if (Number.isNaN(date.getTime())) {
          return true;
        }

        return (
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      });

    /* ============================================================
      CURRENT MONTH TOTALS
    ============================================================ */

    const currentMonthIncome =
      currentMonthTransactions
        .filter((t) => t.type === 'income')
        .reduce(
          (sum, t) =>
            sum + Number(t.amount || 0),
          0
        );

    const currentMonthExpense =
      currentMonthTransactions
        .filter((t) => t.type === 'expense')
        .reduce(
          (sum, t) =>
            sum + Number(t.amount || 0),
          0
        );

    const currentMonthBalance =
      currentMonthIncome - currentMonthExpense;

   /* ============================================================
  FIXED vs VARIABLE EXPENSES
  Fixed expenses like rent, EMI and mess are excluded
  from spending-behavior calculations.
============================================================ */

const variableExpenseTransactions =
  currentMonthTransactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.expenseType !== 'fixed' &&
      Number(t.amount || 0) > 0
  );

const fixedExpenseTransactions =
  currentMonthTransactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.expenseType === 'fixed' &&
      Number(t.amount || 0) > 0
  );

const currentMonthVariableExpense =
  variableExpenseTransactions.reduce(
    (sum, t) =>
      sum + Number(t.amount || 0),
    0
  );

const currentMonthFixedExpense =
  fixedExpenseTransactions.reduce(
    (sum, t) =>
      sum + Number(t.amount || 0),
    0
  );

    /* ============================================================
      CATEGORY BREAKDOWN
    ============================================================ */

    const categoryMap: Record<string, number> = {};

    selectedTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.expenseType !== 'fixed'
      )
      .forEach((t) => {
        const category =
          t.category?.trim() || 'Other';

        categoryMap[category] =
          (categoryMap[category] || 0) +
          Number(t.amount || 0);
      });

    const categoryBreakdown =
      Object.entries(categoryMap)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage:
            totalVariableExpense > 0
              ? Math.round(
                  (amount / totalVariableExpense) * 100
                )
              : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    /* ============================================================
      SPENDING TREND
    ============================================================ */

    const spendingMap: Record<string, number> = {};

    selectedTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.expenseType !== 'fixed'
      )
      .forEach((t) => {
        if (!t.date) return;

        const date = new Date(t.date);

        if (
          date.getMonth() !== currentMonth ||
          date.getFullYear() !== currentYear
        ) {
          return;
        }

        const day = date.getDate().toString();

        spendingMap[day] =
          (spendingMap[day] || 0) +
          Number(t.amount || 0);
      });

    const spendingTrend = Object.entries(
      spendingMap
    )
      .map(([day, amount]) => ({
        day,
        amount,
      }))
      .sort(
        (a, b) =>
          Number(a.day) - Number(b.day)
      );

    /* ============================================================
      TODAY'S SPENDING
    ============================================================ */

    const todayExpenses = transactions.filter(
      (t) => {
        if (t.type !== 'expense') return false;
        if (t.expenseType === 'fixed') return false;
        if (!t.date) return false;

        const date = new Date(t.date);

        if (Number.isNaN(date.getTime())) return false;

        return (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        );
      }
    );

    const todaySpent = todayExpenses.reduce(
      (sum, t) =>
        sum + Number(t.amount || 0),
      0
    );

    /* ============================================================
      MONTH INFORMATION
    ============================================================ */

    const daysInCurrentMonth =
      new Date(
        currentYear,
        currentMonth + 1,
        0
      ).getDate();

    const daysElapsed = Math.max(
      1,
      today.getDate()
    );

    const daysRemaining = Math.max(
      0,
      daysInCurrentMonth - today.getDate()
    );

    /* ============================================================
      DAILY SPENDING LIMIT

      This is a discretionary limit.
      Fixed commitments are not treated as daily spending.
    ============================================================ */

    const remainingVariableBudget = Math.max(
      0,
      totalIncome - currentMonthFixedExpense - currentMonthVariableExpense
    );

    const daysForDailyLimit = Math.max(
      1,
      isCurrentMonth ? daysRemaining || 1 : 30
    );

    const dailyLimit =
      totalIncome > 0
        ? Math.max(
            0,
            Math.round(
              remainingVariableBudget /
                daysForDailyLimit
            )
          )
        : 0;

    const remainingToday = Math.max(
      0,
      dailyLimit - todaySpent
    );

    const dailyLimitPercentage =
      dailyLimit > 0
        ? Math.min(
            100,
            Math.round(
              (todaySpent / dailyLimit) *
                100
            )
          )
        : 0;

    /* ============================================================
      FINANCIAL HEALTH
    ============================================================ */

    const savingsScore =
      totalIncome > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                ((totalIncome -
                  currentMonthFixedExpense -
                  currentMonthVariableExpense) /
                  totalIncome) *
                  100
              )
            )
          )
        : 0;

    const budgetScore =
      totalIncome > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (1 -
                  currentMonthVariableExpense /
                    totalIncome) *
                  100
              )
            )
          )
        : 0;

    /* ============================================================
   SPENDING BEHAVIOR ANALYSIS
   Based on actual transaction history
============================================================ */

const expenseTransactions = selectedTransactions.filter(
  (t) =>
    t.type === 'expense' &&
    t.expenseType !== 'fixed' &&
    Number(t.amount || 0) > 0
);

let behaviorScore = 0;

if (expenseTransactions.length > 0) {
  /*
   * 1. SPENDING CONSISTENCY
   * Checks how stable the user's daily spending pattern is.
   */
  const dailySpending: Record<string, number> = {};

  expenseTransactions.forEach((t) => {
    if (!t.date) return;

    const date = new Date(t.date);

    if (Number.isNaN(date.getTime())) return;

    const dayKey = date.toISOString().split('T')[0];

    dailySpending[dayKey] =
      (dailySpending[dayKey] || 0) +
      Number(t.amount || 0);
  });

  const dailyAmounts = Object.values(dailySpending);

  let consistencyScore = 50;

  if (dailyAmounts.length >= 2) {
    const average =
      dailyAmounts.reduce(
        (sum, value) => sum + value,
        0
      ) / dailyAmounts.length;

    const variance =
      dailyAmounts.reduce(
        (sum, value) =>
          sum +
          Math.pow(value - average, 2),
        0
      ) / dailyAmounts.length;

    const standardDeviation =
      Math.sqrt(variance);

    const coefficient =
      average > 0
        ? standardDeviation / average
        : 0;

    consistencyScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - coefficient * 50)
      )
    );
  }

  /*
   * 2. SPENDING TREND
   * Compares recent spending with earlier spending.
   * Lower recent spending = better behavior.
   */
  const sortedExpenses = [
    ...expenseTransactions,
  ].sort((a, b) => {
    const dateA = a.date
      ? new Date(a.date).getTime()
      : 0;

    const dateB = b.date
      ? new Date(b.date).getTime()
      : 0;

    return dateA - dateB;
  });

  let trendScore = 50;

  if (sortedExpenses.length >= 4) {
    const midpoint =
      Math.floor(sortedExpenses.length / 2);

    const earlierExpenses =
      sortedExpenses.slice(0, midpoint);

    const recentExpenses =
      sortedExpenses.slice(midpoint);

    const earlierTotal =
      earlierExpenses.reduce(
        (sum, t) =>
          sum + Number(t.amount || 0),
        0
      );

    const recentTotal =
      recentExpenses.reduce(
        (sum, t) =>
          sum + Number(t.amount || 0),
        0
      );

    const earlierAverage =
      earlierTotal /
      Math.max(1, earlierExpenses.length);

    const recentAverage =
      recentTotal /
      Math.max(1, recentExpenses.length);

    if (earlierAverage > 0) {
      const change =
        ((recentAverage -
          earlierAverage) /
          earlierAverage) *
        100;

      trendScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(70 - change * 0.5)
        )
      );
    }
  }

  /*
   * 3. LARGE-SPENDING BEHAVIOR
   * Checks how much of the spending comes from
   * unusually large individual transactions.
   */
  const amounts = expenseTransactions
    .map((t) => Number(t.amount || 0))
    .sort((a, b) => a - b);

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
          Math.floor(amounts.length / 2)
        ];

  const largeTransactions =
    median > 0
      ? amounts.filter(
          (amount) =>
            amount > median * 3
        ).length
      : 0;

  const largeTransactionRatio =
    largeTransactions /
    Math.max(1, amounts.length);

  const largeSpendingScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          largeTransactionRatio * 100
      )
    )
  );

  /*
   * FINAL BEHAVIOR SCORE
   *
   * Consistency  = 40%
   * Trend        = 35%
   * Large spend  = 25%
   */
  behaviorScore = Math.round(
    consistencyScore * 0.4 +
      trendScore * 0.35 +
      largeSpendingScore * 0.25
  );

  behaviorScore = Math.max(
    0,
    Math.min(100, behaviorScore)
  );
}

    const healthScore = Math.round(
      (Math.max(0, savingsScore) +
        Math.max(0, budgetScore) +
        behaviorScore) /
        3
    );

    

    /* ============================================================
      TOP CATEGORY / INSIGHTS
    ============================================================ */

    const topCategory =
      categoryBreakdown.length > 0
        ? categoryBreakdown[0]
        : null;

    const insights: Insight[] = [];

    if (topCategory) {
      insights.push({
        type: 'warning',
        title: `${topCategory.category} is your top spending category`,
        detail: `${topCategory.category} accounts for ${topCategory.percentage}% of your variable expenses.`,
      });
    }

    if (balance > 0) {
      insights.push({
        type: 'positive',
        title:
          'You are currently in positive balance',
        detail: `Your current balance is ${currencySymbol}${balance.toLocaleString(
          'en-IN'
        )}.`,
      });
    }

    if (
      dailyLimit > 0 &&
      todaySpent > dailyLimit
    ) {
      insights.push({
        type: 'danger',
        title:
          "You've exceeded today's limit",
        detail: `You spent ${currencySymbol}${todaySpent.toLocaleString(
          'en-IN'
        )} today against a recommended ${currencySymbol}${dailyLimit.toLocaleString(
          'en-IN'
        )}.`,
      });
    }

    if (transactions.length === 0) {
      insights.push({
        type: 'warning',
        title:
          'Start tracking your finances',
        detail:
          'Add your first income or expense to unlock personalized insights.',
      });
    }

    /* ============================================================
      DATA CONFIDENCE
    ============================================================ */

    const loggedDays =
      transactions.length > 0
        ? new Set(
            transactions
              .filter((t) => t.date)
              .map((t) => {
                const date = new Date(t.date!);

                return date
                  .toISOString()
                  .split('T')[0];
              })
          ).size
        : 0;

    const dataConfidence = {
      confidence:
        transactions.length > 0 ? 100 : 0,
      loggedDays,
      zeroSpendDays: 0,
      missingDays: 0,
    };

   /* ============================================================
  CASHFLOW FORECAST
============================================================ */

/*
 * Forecast is only meaningful for the current month.
 * Previous months are already completed, so we show
 * their actual final numbers instead of predicting them.
 */

const forecastDays = Math.max(daysElapsed, 1);

const averageDailyVariableSpendForecast =
  isCurrentMonth &&
  currentMonthVariableExpense > 0
    ? currentMonthVariableExpense / forecastDays
    : 0;

const hasReliableForecastHistory =
  isCurrentMonth && daysElapsed >= 3;

const projectedRemainingVariableExpense =
  hasReliableForecastHistory
    ? Math.round(
        averageDailyVariableSpendForecast * daysRemaining
      )
    : 0;

const projectedMonthEndExpense =
  isCurrentMonth
    ? Math.round(
        currentMonthExpense +
          projectedRemainingVariableExpense
      )
    : currentMonthExpense;

const projectedMonthEndBalance =
  isCurrentMonth
    ? Math.round(
        currentMonthBalance -
          projectedRemainingVariableExpense
      )
    : currentMonthBalance;

const forecastStatus =
  !isCurrentMonth || !hasReliableForecastHistory
    ? 'positive'
    : projectedMonthEndBalance < 0
    ? 'danger'
    : projectedMonthEndBalance <
      currentMonthBalance * 0.25
    ? 'warning'
    : 'positive';

const forecastMessage =
  !isCurrentMonth
    ? 'This month is complete. These are your actual final numbers.'
    : !hasReliableForecastHistory
    ? 'Add at least 3 days of spending history for a more reliable variable-spending forecast.'
    : forecastStatus === 'danger'
    ? 'At your current variable spending rate, your expenses may exceed your available cash before the month ends.'
    : forecastStatus === 'warning'
    ? 'Your current variable spending rate suggests a low month-end balance. Consider reducing discretionary spending.'
    : 'Your current variable spending rate looks manageable for the rest of the month.';
    /* ============================================================
      VARIABLE SPENDING ANALYSIS
      Fixed expenses are excluded from discretionary spending rate.
    ============================================================ */

/*
  Average daily variable spending.

  Example:
  Rent     = ₹4,000 fixed
  Mess     = ₹3,200 fixed
  Shopping = ₹1,000 variable

  Average/day is calculated from ₹1,000,
  NOT ₹8,200.
*/
const averageDailyVariableSpend =
  daysElapsed > 0
    ? currentMonthVariableExpense /
      daysElapsed
    : 0;

/*
  Run-out is based on discretionary/variable
  spending behaviour rather than unavoidable
  fixed commitments.
*/
const runOutDays =
  averageDailyVariableSpend > 0 &&
  currentMonthBalance > 0
    ? Math.round(
        (currentMonthBalance /
          averageDailyVariableSpend) *
          10
      ) / 10
    : 0;
    /* ============================================================
      RENDER
    ============================================================ */

    return (
      <div className="space-y-6">

        {currencyError && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
            Live exchange rates are unavailable. Dashboard totals are hidden to avoid mixing currencies. Please refresh and try again.
          </div>
        )}

        {/* ======================================================
            GREETING
        ====================================================== */}

        <Reveal>
          <div>

            <h1 className="text-2xl font-bold text-white">
              Welcome, {userName}.
            </h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Here's how your money is looking.
            </p>

          </div>
        </Reveal>

        {/* ======================================================
            TOP METRICS
        ====================================================== */}

        <Reveal delay={50}>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <MetricCard
              currencySymbol={currencySymbol}
              icon={
                <TrendingUp className="w-4 h-4" />
              }
              label="Income"
              value={`${currencySymbol}${totalIncome.toLocaleString(
                'en-IN'
              )}`}
              color="text-emerald-400"
            />

            <MetricCard
              currencySymbol={currencySymbol}
              icon={
                <TrendingDown className="w-4 h-4" />
              }
              label="Expenses"
              value={`${currencySymbol}${totalExpense.toLocaleString(
                'en-IN'
              )}`}
              color="text-red-400"
            />

            <MetricCard
              currencySymbol={currencySymbol}
              icon={
                <Wallet className="w-4 h-4" />
              }
              label="Balance"
              value={`${currencySymbol}${balance.toLocaleString(
                'en-IN'
              )}`}
              color="text-white"
            />

            <MetricCard
              currencySymbol={currencySymbol}
              icon={
                <Activity className="w-4 h-4" />
              }
              label="Savings"
              value={`${currencySymbol}${savings.toLocaleString(
                'en-IN'
              )}`}
              color="text-emerald-400"
            />

          </div>

        </Reveal>

        {/* ======================================================
            HEALTH / DAILY LIMIT / RUNOUT
        ====================================================== */}

        <Reveal delay={100}>

          <div className="grid md:grid-cols-3 gap-4">

            {/* FINANCIAL HEALTH */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Financial Health
                </span>

                <Activity className="w-4 h-4 text-emerald-400/50" />

              </div>

              <div className="flex items-center gap-4">

                <div className="relative">

                  <ResponsiveContainer
                    width={90}
                    height={90}
                  >
                    <RadialBarChart
                      innerRadius="68%"
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
                        cornerRadius={8}
                      />

                    </RadialBarChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex items-center justify-center">

                    <span className="text-xl font-bold text-white">
                      {healthScore}
                    </span>

                  </div>

                </div>

                <div className="space-y-1.5 flex-1">

                  <ScoreBar
                    label="Savings"
                    value={Math.max(
                      0,
                      savingsScore
                    )}
                  />

                  <ScoreBar
                    label="Budget"
                    value={Math.max(
                      0,
                      budgetScore
                    )}
                  />

                  <ScoreBar
                    label="Behavior"
                    value={behaviorScore}
                  />

                </div>

              </div>

            </div>

            {/* DAILY LIMIT */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Daily Spending Limit
                </span>

                <Zap className="w-4 h-4 text-emerald-400/50" />

              </div>

              <p className="text-4xl font-bold text-white">

                {currencySymbol}
                {dailyLimit.toLocaleString(
                  'en-IN'
                )}

              </p>

              <p className="text-xs text-gray-500 mt-1">
                Recommended today
              </p>

              <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">

                <div
                  className={`h-full rounded-full ${
                    dailyLimitPercentage >= 100
                      ? 'bg-red-400'
                      : dailyLimitPercentage >= 80
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{
                    width: `${dailyLimitPercentage}%`,
                  }}
                />

              </div>

              <p className="text-xs text-gray-600 mt-2">

                {currencySymbol}
                {todaySpent.toLocaleString(
                  'en-IN'
                )}{' '}
                spent today · {currencySymbol}
                {remainingToday.toLocaleString(
                  'en-IN'
                )}{' '}
                remaining

              </p>

            </div>

            {/* RUN OUT */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Run-Out Warning
                </span>

                <AlertTriangle className="w-4 h-4 text-amber-400/50" />

              </div>

              <p className="text-4xl font-bold text-amber-400">

                ~{runOutDays}

                <span className="text-lg text-gray-500">
                  {' '}
                  days
                </span>

              </p>

              <p className="text-xs text-gray-500 mt-1">
                At current spending rate
              </p>

              <div className="mt-3 flex gap-1">

                {[...Array(10)].map(
                  (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-5 rounded-sm ${
                        i <
                        Math.min(
                          runOutDays,
                          10
                        )
                          ? 'bg-amber-400/40'
                          : 'bg-white/5'
                      }`}
                    />
                  )
                )}

              </div>

              <p className="text-xs text-gray-600 mt-2">

                {currencySymbol}
                {currentMonthBalance.toLocaleString(
                  'en-IN'
                )}{' '}
                balance · {currencySymbol}
                {Math.round(
                  averageDailyVariableSpend
                ).toLocaleString(
                  'en-IN'
                )}
                /day avg

              </p>

            </div>

          </div>

        </Reveal>

        {/* ======================================================
            CASHFLOW FORECAST
        ====================================================== */}

        <Reveal delay={125}>

          <div className="glass-card p-5">

            <div className="flex items-center justify-between mb-5">

              <div>

                <span className="metric-label">
  {isCurrentMonth
    ? 'Cashflow Forecast'
    : 'Monthly Summary'}
</span>

<p className="text-xs text-gray-500 mt-1">
  {isCurrentMonth
    ? 'Based on your spending pace this month'
    : 'Actual results for this month'}
</p>

              </div>

              <span
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                  forecastStatus === 'positive'
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : forecastStatus === 'warning'
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'bg-red-400/10 text-red-400'
                }`}
              >
                {forecastStatus === 'positive'
                  ? 'ON TRACK'
                  : forecastStatus === 'warning'
                  ? 'CAUTION'
                  : 'AT RISK'}
              </span>

            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <ForecastCard
                currencySymbol={currencySymbol}
                label="Current Balance"
                value={currentMonthBalance}
              />

              <ForecastCard
                currencySymbol={currencySymbol}
                label="Avg / Day"
                value={Math.round(
                  averageDailyVariableSpendForecast
                )}
              />

              <ForecastCard
  currencySymbol={currencySymbol}
  label={
    isCurrentMonth
      ? 'Expected Variable Spend'
      : 'Variable Spend'
  }
  value={projectedRemainingVariableExpense}
/>

              <ForecastCard
                currencySymbol={currencySymbol}
                label="Month-End Balance"
                value={projectedMonthEndBalance}
                danger={projectedMonthEndBalance < 0}
                warning={
                  projectedMonthEndBalance >= 0 &&
                  projectedMonthEndBalance <
                    currentMonthBalance * 0.25
                }
              />

            </div>

            <div className="mt-4">

              <div className="flex items-center justify-between mb-2">

                <span className="text-xs text-gray-500">
                  Month progress
                </span>

                <span className="text-xs text-gray-400">
  {isCurrentMonth
    ? `${daysElapsed} / ${daysInCurrentMonth} days`
    : 'Month completed'}
</span>

              </div>

              <div className="h-2 bg-white/5 rounded-full overflow-hidden">

                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                  style={{
                    width: `${
                      isCurrentMonth
                        ? Math.min(
                            100,
                            (daysElapsed / daysInCurrentMonth) * 100
                          )
                        : 100
                    }%`,
                  }}
                />
              </div>

            </div>

            <div
              className={`mt-4 rounded-xl p-4 border ${
                forecastStatus === 'positive'
                  ? 'bg-emerald-400/[0.04] border-emerald-400/10'
                  : forecastStatus === 'warning'
                  ? 'bg-amber-400/[0.04] border-amber-400/10'
                  : 'bg-red-400/[0.04] border-red-400/10'
              }`}
            >

              <div className="flex items-start gap-2">

                {forecastStatus === 'positive' ? (
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 ${
                      forecastStatus === 'warning'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  />
                )}

                <p className="text-sm text-gray-300 leading-relaxed">
                  {forecastMessage}
                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">

              <div className="bg-white/[0.02] rounded-xl p-4">

                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Current Month Income
                </p>

                <p className="text-lg font-bold text-emerald-400 mt-1">
                  {currencySymbol}
                  {currentMonthIncome.toLocaleString(
                    'en-IN'
                  )}
                </p>

              </div>

              <div className="bg-white/[0.02] rounded-xl p-4">

                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Projected Month-End Expense
                </p>

                <p className="text-lg font-bold text-red-400 mt-1">
                  {currencySymbol}
                  {projectedMonthEndExpense.toLocaleString(
                    'en-IN'
                  )}
                </p>

              </div>

            </div>

          </div>

        </Reveal>

        {/* ======================================================
            SPENDING TREND + CATEGORY
        ====================================================== */}

        <Reveal delay={150}>

          <div className="grid md:grid-cols-3 gap-4">

            {/* SPENDING TREND */}

            <div className="md:col-span-2 glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Spending Trend
                </span>

                <span className="text-xs text-emerald-400 flex items-center gap-1">

                  <TrendingDown className="w-3 h-3" />

                  This month

                </span>

              </div>

              {spendingTrend.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={200}
                >

                  <AreaChart
                    data={spendingTrend}
                  >

                    <defs>

                      <linearGradient
                        id="dashTrend"
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
                        color: '#E5E7EB',
                      }}
                      formatter={(value) => [
                        `${currencySymbol}${Number(
                          value ?? 0
                        ).toLocaleString(
                          'en-IN'
                        )}`,
                        'Spending',
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#00FF88"
                      strokeWidth={2}
                      fill="url(#dashTrend)"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              ) : (

                <div className="h-[200px] flex items-center justify-center">

                  <p className="text-sm text-gray-600">
                    No spending data for this month yet.
                  </p>

                </div>

              )}

            </div>

            {/* CATEGORY */}

            <div className="glass-card p-5">

              <span className="metric-label">
                Category Breakdown
              </span>

              {categoryBreakdown.length > 0 ? (

                <>
                  <ResponsiveContainer
                    width="100%"
                    height={160}
                  >

                    <PieChart>

                      <Pie
                        data={categoryBreakdown}
                        dataKey="percentage"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={2}
                      >

                        {categoryBreakdown.map(
                          (_, i) => (
                            <Cell
                              key={i}
                              fill={
                                PIE_COLORS[
                                  i %
                                    PIE_COLORS.length
                                ]
                              }
                            />
                          )
                        )}

                      </Pie>

                      <Tooltip
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

                  <div className="space-y-1.5 mt-2">

                    {categoryBreakdown
                      .slice(0, 4)
                      .map((cat, i) => (

                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-xs"
                        >

                          <div className="flex items-center gap-2">

                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                background:
                                  PIE_COLORS[
                                    i %
                                      PIE_COLORS.length
                                  ],
                              }}
                            />

                            <span className="text-gray-400">
                              {cat.category}
                            </span>

                            {cat.percentage > 40 && (
                              <span className="text-[10px] text-amber-400">
                                High
                              </span>
                            )}

                          </div>

                          <span className="text-gray-300">
                            {cat.percentage}%
                          </span>

                        </div>

                      ))}

                  </div>
                </>

              ) : (

                <div className="h-[200px] flex items-center justify-center">

                  <p className="text-sm text-gray-600 text-center">
                    Add expenses to see category
                    breakdown.
                  </p>

                </div>

              )}

            </div>

          </div>

        </Reveal>

        
        {/* ======================================================
            INSIGHTS + FINANCIAL SUMMARY
        ====================================================== */}

        <Reveal delay={250}>

          <div className="grid md:grid-cols-2 gap-4">

            {/* INSIGHTS */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Top Insights
                </span>

                <Link
                  to="/insights"
                  className="text-xs text-emerald-400 hover:underline"
                >
                  View all
                </Link>

              </div>

              <div className="space-y-2.5">

                {insights
                  .slice(0, 3)
                  .map((insight, i) => (

                    <div
                      key={i}
                      className={`rounded-xl p-3 border ${
                        insight.type ===
                        'positive'
                          ? 'bg-emerald-400/[0.04] border-emerald-400/10'
                          : insight.type ===
                            'warning'
                          ? 'bg-amber-400/[0.04] border-amber-400/10'
                          : 'bg-red-400/[0.04] border-red-400/10'
                      }`}
                    >

                      <p className="text-sm font-medium text-gray-100">
                        {insight.title}
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {insight.detail}
                      </p>

                    </div>

                  ))}

                {insights.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Add transactions to get
                    personalized insights.
                  </p>
                )}

              </div>

            </div>

            {/* FINANCIAL SUMMARY */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Financial Summary
                </span>

                <FileText className="w-4 h-4 text-emerald-400/50" />

              </div>

              <div className="bg-emerald-400/[0.03] border border-emerald-400/10 rounded-xl p-4">

                <div className="flex items-center gap-2 mb-3">

                  <FileText className="w-4 h-4 text-emerald-400" />

                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                    Current Data
                  </span>

                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">

                  <div>

                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Spending
                    </p>

                    <p className="text-lg font-bold text-white">
                      {currencySymbol}
                      {totalExpense.toLocaleString(
                        'en-IN'
                      )}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Savings
                    </p>

                    <p className="text-lg font-bold text-emerald-400">
                      {currencySymbol}
                      {savings.toLocaleString(
                        'en-IN'
                      )}
                    </p>

                  </div>

                </div>

                <p className="text-xs text-gray-400 leading-relaxed">

                  {topCategory
                    ? `Your highest discretionary category is ${topCategory.category} at ${topCategory.percentage}% of variable expenses.`
                    : 'Add transactions to generate your financial summary.'}

                </p>

              </div>

            </div>

          </div>

        </Reveal>

        {/* ======================================================
            TODAY + DATA CONFIDENCE
        ====================================================== */}

        <Reveal delay={300}>

          <div className="grid md:grid-cols-2 gap-4">

            {/* TODAY'S TRACKING */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Today's Tracking
                </span>

                <Calendar className="w-4 h-4 text-gray-600" />

              </div>

              {todayStatus ? (

                <div className="flex items-center gap-3 bg-emerald-400/[0.04] border border-emerald-400/10 rounded-xl p-3">

                  <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center">

                    <Check className="w-4 h-4 text-emerald-400" />

                  </div>

                  <div>

                    <p className="text-sm text-emerald-300">

                      {todayStatus === 'logged'
                        ? "Today's finances are logged"
                        : 'Zero spending confirmed'}

                    </p>

                    <p className="text-xs text-gray-500">
                      Thank you for tracking consistently
                    </p>

                  </div>

                </div>

              ) : (

                <div className="space-y-3">

                  <p className="text-sm text-gray-400">
                    You haven't confirmed today's activity.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">

                    <button
                      onClick={() =>
                        setTodayStatus(
                          'logged'
                        )
                      }
                      className="px-4 py-2 bg-emerald-400 text-[#050505] text-xs font-semibold rounded-lg hover:bg-emerald-300 transition-all"
                    >
                      I've logged today
                    </button>

                    <button
                      onClick={() =>
                        setTodayStatus(
                          'zero_spend'
                        )
                      }
                      className="px-4 py-2 glass text-gray-300 text-xs font-semibold rounded-lg hover:text-white transition-all"
                    >
                      No spending today
                    </button>

                  </div>

                </div>

              )}

            </div>

            {/* DATA CONFIDENCE */}

            <div className="glass-card p-5">

              <div className="flex items-center justify-between mb-4">

                <span className="metric-label">
                  Data Confidence
                </span>

                <span className="text-xs text-emerald-400 font-semibold">
                  {dataConfidence.confidence}%
                </span>

              </div>

              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">

                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  style={{
                    width: `${dataConfidence.confidence}%`,
                  }}
                />

              </div>

              <div className="grid grid-cols-3 gap-2 text-center">

                <div>

                  <p className="text-lg font-semibold text-emerald-400">
                    {dataConfidence.loggedDays}
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Logged
                  </p>

                </div>

                <div>

                  <p className="text-lg font-semibold text-gray-300">
                    {dataConfidence.zeroSpendDays}
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Zero spend
                  </p>

                </div>

                <div>

                  <p className="text-lg font-semibold text-amber-400">
                    {dataConfidence.missingDays}
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Missing
                  </p>

                </div>

              </div>

            </div>

          </div>

        </Reveal>

        {/* ======================================================
            LOADING STATE
        ====================================================== */}

        {loading && (
          <div className="fixed bottom-5 right-5 glass-card px-4 py-2.5 text-xs text-gray-400">
            Updating financial data...
          </div>
        )}

      </div>
    );
  }

  /* ============================================================
    METRIC CARD
  ============================================================ */

  function MetricCard({
    icon,
    label,
    value,
    color,
    currencySymbol,
  }: {
    icon: ReactNode;
    label: string;
    value: string;
    color: string;
    currencySymbol: string;
  }) {
    const numericValue = Number(
      value.replace(/[^0-9.-]/g, '')
    );

    return (
      <div className="glass-card p-4">

        <div className="flex items-center gap-2 mb-2">

          <span className={color}>
            {icon}
          </span>

          <span className="metric-label">
            {label}
          </span>

        </div>

        <p className="text-xl md:text-2xl font-bold text-white">

          <CountUp
            value={
              Number.isFinite(numericValue)
                ? Math.abs(numericValue)
                : 0
            }
            prefix={currencySymbol}
          />

        </p>

      </div>
    );
  }

  /* ============================================================
    SCORE BAR
  ============================================================ */

  function ScoreBar({
    label,
    value,
  }: {
    label: string;
    value: number;
  }) {
    return (
      <div>

        <div className="flex items-center justify-between mb-0.5">

          <span className="text-[10px] text-gray-500">
            {label}
          </span>

          <span className="text-[10px] text-gray-600">
            {value}/100
          </span>

        </div>

        <div className="h-1 bg-white/5 rounded-full overflow-hidden">

          <div
            className="h-full bg-emerald-400/60 rounded-full"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, value)
              )}%`,
            }}
          />

        </div>

      </div>
    );
  }

  /* ============================================================
    FORECAST CARD
  ============================================================ */

  function ForecastCard({
    label,
    value,
    danger = false,
    warning = false,
    currencySymbol,
  }: {
    label: string;
    value: number;
    danger?: boolean;
    warning?: boolean;
    currencySymbol: string;
  }) {
    return (
      <div className="bg-white/[0.02] rounded-xl p-3">

        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </p>
        

        <p
          className={`text-lg font-bold mt-1 ${
            danger
              ? 'text-red-400'
              : warning
              ? 'text-amber-400'
              : 'text-white'
          }`}
        >
          {currencySymbol}
          {value.toLocaleString(
            'en-IN'
          )}
        </p>

      </div>
    );
  }
