
export interface Stock {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  lastUpdated: Date;
}

export interface ChartPoint {
  time: string;
  price: number;
  volume: number;
}

export interface NewsItem {
  source: string;
  headline: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  timestamp: string;
}

export interface Prediction {
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  confidence: number;
  technicalSummary: string;
  newsSummary: string;
  news: NewsItem[];
  groundingUrls?: string[];
  generatedAt: Date;
}

export interface AlertConfig {
  symbol: string;
  thresholdPercent: number;
  enabled: boolean;
  basePrice: number;
}

export enum Timeframe {
  Intraday = '1d',
  Week = '1wk',
  Month = '1mo',
  ThreeMonths = '3mo',
  Year = '1y',
  FiveYears = '5y'
}

export type ModalType = 'ADD_STOCK' | 'SET_ALERT' | 'PREDICTION' | 'NONE';

export interface TerminalLine {
  type: 'COMMAND' | 'ERROR' | 'SUCCESS' | 'TEXT' | 'TABLE_STOCKS' | 'CHART' | 'PREDICTION_REPORT';
  content: any;
}

// New Types for Navigation and Pages
export type Page = 'DASHBOARD' | 'PORTFOLIO' | 'AI_ANALYSIS' | 'OPPORTUNITIES' | 'SCREENER' | 'SETTINGS';

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Opportunity {
  symbol: string;
  type: 'BULLISH' | 'BEARISH' | 'VALUE' | 'MOMENTUM';
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  metric: string; // The specific metric relevant to the query (e.g., "RSI: 24")
  matchScore: number; // 0-100
}

export interface UserData {
  watchlist: string[];
  portfolio: PortfolioItem[];
  alerts: AlertConfig[];
  userSettings?: {
    customApiKey?: string;
  };
}

export interface AuthState {
  token: string;
  username: string;
  repo: string;
  sha?: string; // File blob SHA for updates
  isAuthenticated: boolean;
  isLocal?: boolean;
  cryptoKey?: CryptoKey; // Session key for encryption (not stored)
  salt?: string; // Salt for encryption
}

export interface PendingAction {
  type: 'ADD_PORTFOLIO' | 'ANALYZE' | 'CHECK_OPPORTUNITY' | 'FIND_SIMILAR';
  symbol: string;
}
