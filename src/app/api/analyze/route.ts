import { NextRequest, NextResponse } from "next/server";
import { analyzeStockQuote } from "@/lib/analysis";
import { fetchStockQuote } from "@/lib/stock";
import { getSupabaseAdmin } from "@/lib/supabase";
import { StockAnalysis, StockQuote } from "@/lib/types";

async function saveAnalysisWithRetry(payload: {
  symbol: string;
  provider: string;
  market_data: StockQuote;
  analysis: StockAnalysis;
}) {
  const supabase = getSupabaseAdmin();
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { data, error } = await supabase
      .from("stock_analyses")
      .insert(payload)
      .select("id, symbol, provider, market_data, analysis, created_at")
      .single();

    if (!error) {
      return { data, error: null };
    }

    lastError = error.message;

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  return { data: null, error: lastError };
}

export async function POST(request: NextRequest) {
  let symbol: string | undefined;

  try {
    const body = (await request.json()) as { symbol?: string };
    symbol = body.symbol?.trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!symbol) {
    return NextResponse.json(
      { error: "Body field 'symbol' is required." },
      { status: 400 },
    );
  }

  try {
    const quote = await fetchStockQuote(symbol);
    const analysis = await analyzeStockQuote(quote);
    const { data, error } = await saveAnalysisWithRetry({
      symbol: quote.symbol,
      provider: "twelvedata",
      market_data: quote,
      analysis,
    });

    return NextResponse.json({
      quote,
      analysis,
      savedRecord: data,
      storageWarning: error ? `Supabase save skipped: ${error}` : null,
      promptExample: {
        instructions:
          "You are an equity research assistant. Return strict JSON only.",
        schema: {
          summary: "string",
          sentiment: ["Bullish", "Neutral", "Bearish"],
          risk_level: ["Low", "Medium", "High"],
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze stock data.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
