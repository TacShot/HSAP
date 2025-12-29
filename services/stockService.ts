import { Stock, ChartPoint, Timeframe } from '../types';

// Helper to generate random walk data
const randomWalk = (startPrice: number, steps: number, volatility: number): number[] => {
  const prices = [startPrice];
  for (let i = 1; i < steps; i++) {
    const change = prices[i - 1] * (Math.random() - 0.5) * volatility;
    prices.push(prices[i - 1] + change);
  }
  return prices;
};

// Seed data for consistent simulation
const BASE_PRICES: Record<string, number> = {
  'RELIANCE.NS': 2450.00,
  'TCS.NS': 3500.00,
  'HDFCBANK.NS': 1600.00,
  'INFY.NS': 1400.00,
  'TATAMOTORS.NS': 600.00,
  'SBIN.NS': 580.00,
  'ADANIENT.NS': 2400.00,
  'WIPRO.NS': 400.00,
  'BHEL.NS': 120.00,
  'ITC.NS': 450.00,
};

export const fetchStockData = async (symbol: string): Promise<Stock> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));

  const base = BASE_PRICES[symbol] || 100.00;
  // Fluctuate around base
  const volatility = 0.02; // 2% daily swing
  const currentPrice = base + (base * (Math.random() - 0.5) * volatility);
  const previousClose = base;
  
  const change = currentPrice - previousClose;
  const percentChange = (change / previousClose) * 100;

  return {
    symbol,
    price: currentPrice,
    change,
    percentChange,
    previousClose,
    open: previousClose * (1 + (Math.random() - 0.5) * 0.01),
    high: currentPrice * 1.01,
    low: currentPrice * 0.99,
    volume: Math.floor(Math.random() * 1000000) + 50000,
    lastUpdated: new Date()
  };
};

export const fetchHistoricalData = async (symbol: string, timeframe: Timeframe): Promise<ChartPoint[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const base = BASE_PRICES[symbol] || 100.00;
  let points = 0;
  let volatility = 0.005;
  let intervalLabel = 'time'; // 'time' or 'date'

  switch (timeframe) {
    case Timeframe.Intraday:
      points = 50;
      volatility = 0.002;
      break;
    case Timeframe.Week:
      points = 70;
      volatility = 0.005;
      intervalLabel = 'date';
      break;
    case Timeframe.Month:
      points = 60;
      volatility = 0.01;
      intervalLabel = 'date';
      break;
    default:
      points = 100;
      volatility = 0.02;
      intervalLabel = 'date';
  }

  const prices = randomWalk(base, points, volatility);
  
  const now = new Date();
  const data: ChartPoint[] = prices.map((price, index) => {
    const timeOffset = points - index;
    let timeLabel = '';
    
    if (intervalLabel === 'time') {
        const d = new Date(now.getTime() - timeOffset * 60000 * 5); // 5 min intervals
        timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } else {
        const d = new Date(now.getTime() - timeOffset * 86400000); // 1 day intervals
        timeLabel = `${d.getMonth()+1}/${d.getDate()}`;
    }

    return {
      time: timeLabel,
      price: price,
      volume: Math.floor(Math.random() * 50000) + 10000
    };
  });

  return data;
};

export const isValidSymbol = (symbol: string): boolean => {
  return symbol.endsWith('.NS') || symbol.endsWith('.BO');
};