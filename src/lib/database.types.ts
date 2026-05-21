import { StockAnalysis, StockQuote } from "@/lib/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      stock_analyses: {
        Row: {
          id: number;
          symbol: string;
          provider: string;
          market_data: StockQuote;
          analysis: StockAnalysis;
          created_at: string;
        };
        Insert: {
          id?: never;
          symbol: string;
          provider: string;
          market_data: StockQuote;
          analysis: StockAnalysis;
          created_at?: string;
        };
        Update: {
          id?: never;
          symbol?: string;
          provider?: string;
          market_data?: StockQuote;
          analysis?: StockAnalysis;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
