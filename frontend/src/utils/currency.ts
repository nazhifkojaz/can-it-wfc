/**
 * Currency utilities for visit spending tracking
 * Auto-detects currency based on cafe location
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

/**
 * Detect currency based on latitude and longitude.
 * Uses simple bounding box approach for major regions.
 */
export function detectCurrencyFromCoordinates(latitude: number, longitude: number): string {
  const lat = latitude;
  const lon = longitude;

  // Southeast Asia
  if (lat >= -11 && lat <= 6 && lon >= 95 && lon <= 141) {
    // Singapore
    if (lat >= 1.1 && lat <= 1.5 && lon >= 103.6 && lon <= 104.1) {
      return 'SGD';
    }

    // Malaysia
    if (lat >= 0.8 && lat <= 7.4 && lon >= 99.6 && lon <= 119.3) {
      return 'MYR';
    }

    // Thailand
    if (lat >= 5.6 && lat <= 20.5 && lon >= 97.3 && lon <= 105.6) {
      return 'THB';
    }

    // Philippines
    if (lat >= 4.6 && lat <= 21.1 && lon >= 116.9 && lon <= 126.6) {
      return 'PHP';
    }

    // Vietnam
    if (lat >= 8.5 && lat <= 23.4 && lon >= 102.1 && lon <= 109.5) {
      return 'VND';
    }

    // Indonesia (default for SEA region)
    return 'IDR';
  }

  // Japan
  if (lat >= 24 && lat <= 46 && lon >= 123 && lon <= 146) {
    return 'JPY';
  }

  // South Korea
  if (lat >= 33 && lat <= 43 && lon >= 124 && lon <= 132) {
    return 'KRW';
  }

  // China
  if (lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135) {
    return 'CNY';
  }

  // India
  if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97) {
    return 'INR';
  }

  // Australia
  if (lat >= -44 && lat <= -10 && lon >= 113 && lon <= 154) {
    return 'AUD';
  }

  // Europe (approximate)
  if (lat >= 36 && lat <= 71 && lon >= -10 && lon <= 40) {
    // UK
    if (lat >= 49.9 && lat <= 60.9 && lon >= -8.2 && lon <= 1.8) {
      return 'GBP';
    }
    return 'EUR';
  }

  // United States
  if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) {
    return 'USD';
  }

  // Default to USD for anywhere else
  return 'USD';
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number | string | null | undefined, currencyCode: string): string {
  // Handle null/undefined/empty
  if (amount === null || amount === undefined || amount === '') {
    return 'Not specified';
  }

  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check if valid number
  if (isNaN(numAmount)) {
    return 'Not specified';
  }

  const currency = CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;

  // Currencies without decimal places
  if (['IDR', 'VND', 'JPY', 'KRW'].includes(currencyCode)) {
    return `${symbol} ${Math.round(numAmount).toLocaleString()}`;
  }

  // Currencies with decimal places
  return `${symbol}${numAmount.toFixed(2)}`;
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}
