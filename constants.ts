import { Timeframe } from './types';

export const INITIAL_WATCHLIST = [
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'TATAMOTORS.NS',
  'SBIN.NS',
  'ADANIENT.NS'
];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  [Timeframe.Intraday]: 'Intraday (1m)',
  [Timeframe.Week]: '1 Week (15m)',
  [Timeframe.Month]: '1 Month (1h)',
  [Timeframe.ThreeMonths]: '3 Months (1d)',
  [Timeframe.Year]: '1 Year (1wk)',
  [Timeframe.FiveYears]: '5 Years (1mo)',
};

export const REFRESH_RATE_MS = 2000; // Simulated polling interval