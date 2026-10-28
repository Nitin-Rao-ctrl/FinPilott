export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type CurrencyRates = Record<SupportedCurrency, number>;

export type CurrencyAmount = {
  amount: number;
  currency?: string | null;
};

const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  'INR',
  'USD',
  'EUR',
  'GBP',
];

const PROFILE_KEY_PREFIX = 'finpilot_profile_';

let cachedRates: CurrencyRates | null = null;
let cachedAt = 0;
let inFlightRequest: Promise<CurrencyRates> | null = null;

// Rates are refreshed after 30 minutes.
const RATE_CACHE_MS = 30 * 60 * 1000;

export function normalizeCurrency(
  currency?: string | null
): SupportedCurrency {
  const code = String(currency || 'INR').toUpperCase();

  return SUPPORTED_CURRENCIES.includes(code as SupportedCurrency)
    ? (code as SupportedCurrency)
    : 'INR';
}

/**
 * Reads the profile's selected display currency from the existing
 * user-specific localStorage profile. Falls back to INR.
 */
export function getPreferredCurrency(userId?: string | null): SupportedCurrency {
  if (!userId || typeof localStorage === 'undefined') {
    return 'INR';
  }

  try {
    const saved = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
    if (!saved) return 'INR';

    const profile = JSON.parse(saved);
    return normalizeCurrency(profile?.currency);
  } catch {
    return 'INR';
  }
}

/**
 * Fetches current exchange rates from a public, keyless exchange-rate API.
 * Rates are expressed as units per 1 USD. We deliberately do not hardcode
 * fallback rates: if the API is unavailable, conversion fails safely.
 */
export async function getCurrencyRates(
  forceRefresh = false
): Promise<CurrencyRates> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedRates &&
    now - cachedAt < RATE_CACHE_MS
  ) {
    return cachedRates;
  }

  if (!forceRefresh && inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');

    if (!response.ok) {
      throw new Error(`Exchange-rate service returned ${response.status}`);
    }

    const payload = await response.json();
    const rates = payload?.rates;

    if (
      payload?.result !== 'success' ||
      !rates ||
      !Number.isFinite(Number(rates.USD)) ||
      !Number.isFinite(Number(rates.INR)) ||
      !Number.isFinite(Number(rates.EUR)) ||
      !Number.isFinite(Number(rates.GBP))
    ) {
      throw new Error('Exchange-rate response was incomplete');
    }

    const nextRates: CurrencyRates = {
      USD: Number(rates.USD),
      INR: Number(rates.INR),
      EUR: Number(rates.EUR),
      GBP: Number(rates.GBP),
    };

    cachedRates = nextRates;
    cachedAt = Date.now();
    return nextRates;
  })();

  try {
    return await inFlightRequest;
  } finally {
    inFlightRequest = null;
  }
}

/**
 * Converts an amount from its original currency to the reporting currency.
 * Returns null if a live rate cannot be obtained, rather than showing a
 * misleading financial total.
 */
export async function convertCurrencyAmount(
  amount: number,
  fromCurrency: string | null | undefined,
  toCurrency: string
): Promise<number | null> {
  const safeAmount = Number(amount);

  if (!Number.isFinite(safeAmount)) return null;

  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);

  if (from === to) return safeAmount;

  try {
    const rates = await getCurrencyRates();

    // API rates are units per 1 USD:
    // amount / source units-per-USD * target units-per-USD
    const converted = (safeAmount / rates[from]) * rates[to];

    return Number.isFinite(converted) ? converted : null;
  } catch (error) {
    console.error('Currency conversion unavailable:', error);
    return null;
  }
}

/**
 * Formats an amount using a currency's locale-aware symbol and separators.
 * Formatting is separate from conversion.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale?: string
): string {
  const code = normalizeCurrency(currency);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${code} ${safeAmount.toFixed(2)}`;
  }
}

/**
 * Convert one transaction while retaining its original fields.
 * Returns null if exchange rates are unavailable.
 */
export async function convertTransactionAmount<
  T extends { amount?: number | string; currency?: string | null }
>(
  transaction: T,
  reportingCurrency: string
): Promise<(Omit<T, 'amount' | 'currency'> & {
  amount: number;
  currency: SupportedCurrency;
  originalAmount: number;
  originalCurrency: SupportedCurrency;
}) | null> {
  const originalAmount = Number(transaction.amount ?? 0);

  if (!Number.isFinite(originalAmount)) return null;

  const originalCurrency = normalizeCurrency(transaction.currency);
  const convertedAmount = await convertCurrencyAmount(
    originalAmount,
    originalCurrency,
    reportingCurrency
  );

  if (convertedAmount === null) return null;

  return {
    ...transaction,
    amount: convertedAmount,
    currency: normalizeCurrency(reportingCurrency),
    originalAmount,
    originalCurrency,
  };
}

/**
 * Converts a complete list for analytics. If any required conversion fails,
 * returns null so callers can display an error instead of mixing currencies.
 */
export async function convertTransactions<
  T extends { amount?: number | string; currency?: string | null }
>(
  transactions: T[],
  reportingCurrency: string
): Promise<Array<T & { amount: number; currency: SupportedCurrency }> | null> {
  const target = normalizeCurrency(reportingCurrency);

  try {
    const rates = await getCurrencyRates();

    return transactions.map((transaction) => {
      const amount = Number(transaction.amount ?? 0);

      if (!Number.isFinite(amount)) {
        throw new Error('Transaction has an invalid amount');
      }

      const source = normalizeCurrency(transaction.currency);

      const convertedAmount =
        source === target
          ? amount
          : (amount / rates[source]) * rates[target];

      if (!Number.isFinite(convertedAmount)) {
        throw new Error('Currency conversion produced an invalid amount');
      }

      return {
        ...transaction,
        amount: convertedAmount,
        currency: target,
      };
    });
  } catch (error) {
    console.error('Could not convert transactions:', error);
    return null;
  }
}
