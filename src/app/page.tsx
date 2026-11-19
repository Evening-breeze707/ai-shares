"use client";

import { FormEvent, useState } from "react";
import { AnalysisRecord, StockAnalysis, StockQuote } from "@/lib/types";

type ApiState = {
  loadingQuote: boolean;
  loadingAnalysis: boolean;
  error: string | null;
};

function formatNumber(value: number | null, digits = 2) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const timestamp =
      numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue;
    const unixDate = new Date(timestamp);

    if (!Number.isNaN(unixDate.getTime())) {
      return unixDate.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sentimentTone(sentiment?: StockAnalysis["sentiment"]) {
  if (sentiment === "Bullish") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (sentiment === "Bearish") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

function riskTone(level?: StockAnalysis["risk_level"]) {
  if (level === "Low") {
    return "bg-teal-100 text-teal-800";
  }

  if (level === "High") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-slate-200 text-slate-800";
}

export default function Home() {
  const [symbol, setSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [apiState, setApiState] = useState<ApiState>({
    loadingQuote: false,
    loadingAnalysis: false,
    error: null,
  });

  async function loadHistory(currentSymbol?: string) {
    const search = currentSymbol?.trim()
      ? `?symbol=${encodeURIComponent(currentSymbol.trim().toUpperCase())}`
      : "";

    const response = await fetch(`/api/history${search}`, {
      method: "GET",
    });

    const payload = (await response.json()) as {
      records?: AnalysisRecord[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load analysis history.");
    }

    setHistory(payload.records ?? []);
  }

  async function handleFetchQuote(event?: FormEvent) {
    event?.preventDefault();

    const currentSymbol = symbol.trim().toUpperCase();

    if (!currentSymbol) {
      setApiState((prev) => ({
        ...prev,
        error: "Please enter a stock symbol first.",
      }));
      return;
    }

    setApiState((prev) => ({
      ...prev,
      loadingQuote: true,
      error: null,
    }));

    try {
      const response = await fetch(
        `/api/stock?symbol=${encodeURIComponent(currentSymbol)}`,
      );
      const payload = (await response.json()) as {
        quote?: StockQuote;
        error?: string;
      };

      if (!response.ok || !payload.quote) {
        throw new Error(payload.error ?? "Failed to fetch stock quote.");
      }

      setQuote(payload.quote);
      setAnalysis(null);
      setLastSavedAt(null);
      await loadHistory(currentSymbol);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch stock quote.";

      setApiState((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setApiState((prev) => ({
        ...prev,
        loadingQuote: false,
      }));
    }
  }

  async function handleAnalyze() {
    const currentSymbol = symbol.trim().toUpperCase();

    if (!currentSymbol) {
      setApiState((prev) => ({
        ...prev,
        error: "Please enter a stock symbol first.",
      }));
      return;
    }

    setApiState((prev) => ({
      ...prev,
      loadingAnalysis: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol: currentSymbol }),
      });

      const payload = (await response.json()) as {
        quote?: StockQuote;
        analysis?: StockAnalysis;
        savedRecord?: AnalysisRecord;
        storageWarning?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.quote || !payload.analysis) {
        throw new Error(payload.error ?? "Failed to analyze stock.");
      }

      setQuote(payload.quote);
      setAnalysis(payload.analysis);
      setLastSavedAt(payload.savedRecord?.created_at ?? null);
      await loadHistory(currentSymbol);

      if (payload.storageWarning) {
        setApiState((prev) => ({
          ...prev,
          error: payload.storageWarning ?? null,
        }));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze stock.";

      setApiState((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setApiState((prev) => ({
        ...prev,
        loadingAnalysis: false,
      }));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[var(--surface-strong)] shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              AI Equity Research Demo
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                AI Stock Analysis Panel
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Enter a stock symbol, fetch a free market quote, then let the AI
                return strict JSON analysis and save the result to Supabase.
              </p>
            </div>

            <form
              onSubmit={handleFetchQuote}
              className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-4 shadow-sm md:flex-row"
            >
              <label className="flex-1">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Stock Symbol
                </span>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg uppercase outline-none transition focus:border-teal-600 focus:bg-white"
                />
              </label>

              <div className="flex gap-3 md:self-end">
                <button
                  type="submit"
                  disabled={apiState.loadingQuote}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {apiState.loadingQuote ? "Loading..." : "Get Quote"}
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={apiState.loadingAnalysis}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {apiState.loadingAnalysis ? "Analyzing..." : "AI Analyze"}
                </button>
              </div>
            </form>

            {apiState.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[var(--danger)]">
                {apiState.error}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Last Price"
                value={quote ? `${formatNumber(quote.close)} ${quote.currency}` : "--"}
              />
              <MetricCard
                label="Change"
                value={quote ? formatNumber(quote.change) : "--"}
              />
              <MetricCard
                label="Change %"
                value={quote ? formatPercent(quote.percentChange) : "--"}
              />
              <MetricCard
                label="Volume"
                value={quote ? formatNumber(quote.volume, 0) : "--"}
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-slate-950 p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-teal-200/80">
                  Market Snapshot
                </p>
                <h2 className="mt-2 text-3xl font-semibold">
                  {quote?.symbol ?? "----"}
                </h2>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                {quote?.exchange ?? "Waiting for data"}
              </div>
            </div>

            <dl className="grid gap-4 text-sm text-white/80">
              <DataRow label="Company" value={quote?.name ?? "--"} />
              <DataRow
                label="Open / High / Low"
                value={
                  quote
                    ? `${formatNumber(quote.open)} / ${formatNumber(quote.high)} / ${formatNumber(quote.low)}`
                    : "--"
                }
              />
              <DataRow
                label="Previous Close"
                value={quote ? formatNumber(quote.previousClose) : "--"}
              />
              <DataRow
                label="Updated"
                value={quote ? formatDate(quote.timestamp) : "--"}
              />
              <DataRow
                label="Saved to Supabase"
                value={lastSavedAt ? formatDate(lastSavedAt) : "Run AI analysis to store a record"}
              />
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Structured Output
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                AI Analysis Result
              </h3>
            </div>
            {analysis ? (
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${sentimentTone(
                    analysis.sentiment,
                  )}`}
                >
                  {analysis.sentiment}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${riskTone(
                    analysis.risk_level,
                  )}`}
                >
                  Risk: {analysis.risk_level}
                </span>
              </div>
            ) : null}
          </div>

          {analysis ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-7 text-emerald-200">
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(analysis, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <EmptyState text="Click AI Analyze to show the model's strict JSON output here." />
          )}
        </article>

        <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Database Records
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              Recent Analysis History
            </h3>
          </div>

          {history.length > 0 ? (
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {record.symbol}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(record.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${sentimentTone(
                          record.analysis.sentiment,
                        )}`}
                      >
                        {record.analysis.sentiment}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${riskTone(
                          record.analysis.risk_level,
                        )}`}
                      >
                        {record.analysis.risk_level}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {record.analysis.summary}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No analysis records yet. Run AI Analyze once to save a record into Supabase." />
          )}
        </article>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-white/55">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-5 py-10 text-center text-sm leading-7 text-slate-500">
      {text}
    </div>
  );
}
