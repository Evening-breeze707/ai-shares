import { StockQuote } from "@/lib/types";
import { getRequiredEnv } from "@/lib/env";

type TwelveDataQuoteResponse = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  volume?: string;
  timestamp?: string;
  code?: number;
  message?: string;
  status?: string;
};

function toNumber(value?: string) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const apiKey = getRequiredEnv("TWELVE_DATA_API_KEY");
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error("Stock symbol is required.");
  }

  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", normalizedSymbol);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Stock API request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as TwelveDataQuoteResponse;

  if (data.status === "error" || data.code || data.message) {
    throw new Error(data.message ?? "Failed to fetch stock quote.");
  }

  return {
    symbol: data.symbol ?? normalizedSymbol,
    name: data.name ?? normalizedSymbol,
    exchange: data.exchange ?? "Unknown",
    currency: data.currency ?? "USD",
    open: toNumber(data.open),
    high: toNumber(data.high),
    low: toNumber(data.low),
    close: toNumber(data.close),
    previousClose: toNullableNumber(data.previous_close),
    change: toNumber(data.change),
    percentChange: toNumber(data.percent_change),
    volume: toNullableNumber(data.volume),
    timestamp: data.timestamp ?? null,
  };
}
