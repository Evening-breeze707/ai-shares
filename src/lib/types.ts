export type Sentiment = "Bullish" | "Neutral" | "Bearish";

export type RiskLevel = "Low" | "Medium" | "High";

export type StockQuote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number | null;
  change: number;
  percentChange: number;
  volume: number | null;
  timestamp: string | null;
};

export type StockAnalysis = {
  summary: string;
  sentiment: Sentiment;
  risk_level: RiskLevel;
};

export type AnalysisRecord = {
  id: number;
  symbol: string;
  provider: string;
  market_data: StockQuote;
  analysis: StockAnalysis;
  created_at: string;
};
