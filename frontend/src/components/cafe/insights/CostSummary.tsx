import React, { useState, useMemo } from 'react';
import { SpendInsight, PriceLabel } from '../../../types/insights';
import { CURRENCIES } from '../../../utils/currency';
import styles from './insights.module.css';

interface Props {
  spend: SpendInsight;
  exchangeRates?: Record<string, number>;
}

const symbol = (c: string) => CURRENCIES.find(cur => cur.code === c)?.symbol ?? c;

const formatAmount = (amount: number, currency: string) => {
  if (['IDR', 'VND', 'JPY', 'KRW'].includes(currency)) {
    return Math.round(amount).toLocaleString();
  }
  return amount.toFixed(2);
};

const convertAmount = (
  fromAmount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number => {
  if (fromCurrency === toCurrency) return fromAmount;
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return fromAmount;
  return fromAmount * (fromRate / toRate);
};

const PERCENTILE_COPY: Record<PriceLabel, string> = {
  cheaper_than_most: 'Cheaper than most cafes nearby',
  mid_range: 'Mid-range for the area',
  pricier_than_most: 'Pricier than most cafes nearby',
};

const CostSummary: React.FC<Props> = ({ spend, exchangeRates }) => {
  const { primary } = spend;
  const [selectedCurrency, setSelectedCurrency] = useState(primary.currency);

  const convertedMedian = useMemo(() => {
    if (!exchangeRates) return primary.median;
    return convertAmount(primary.median, primary.currency, selectedCurrency, exchangeRates);
  }, [primary.median, primary.currency, selectedCurrency, exchangeRates]);

  return (
    <div className={styles.section}>
      <div className={styles.costRow}>
        <div>
          Typical spend ~{symbol(selectedCurrency)}
          {formatAmount(convertedMedian, selectedCurrency)}{' '}
          {selectedCurrency}{' '}
          <span className={styles.muted}>({primary.n} visits)</span>
        </div>
        <select
          className={styles.currencySelect}
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} ({symbol(c.code)})
            </option>
          ))}
        </select>
      </div>
      {spend.percentile && (
        <p className={styles.percentileLine}>
          {PERCENTILE_COPY[spend.percentile.label]}
          {' '}
          <span className={styles.muted}>
            ({spend.percentile.cluster_size} cafes compared)
          </span>
        </p>
      )}
      {exchangeRates && primary.currency !== 'USD' && (
        <p className={styles.currencyDisclaimer}>
          1 {primary.currency} ≈ {exchangeRates[primary.currency]?.toFixed(6) ?? '—'} USD · updated monthly
        </p>
      )}
      {spend.secondary && spend.secondary.length > 0 && (
        <div className={styles.secondaryCosts}>
          {spend.secondary.map((s) => (
            <span key={s.currency} className={styles.muted}>
              +{s.n} visits in {s.currency}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CostSummary;
