"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnalysisRecord, StockAnalysis, StockQuote } from "@/lib/types";

type Lang = "en" | "zh";

type ApiState = {
  loadingQuote: boolean;
  loadingAnalysis: boolean;
  error: string | null;
};

const I18N = {
  en: {
    badge: "AI Equity Research Demo",
    title: "AI Stock Analysis Panel",
    description:
      "Enter a stock symbol, fetch a free market quote, then let the AI return strict JSON analysis and save the result to Supabase.",
    symbol: "Stock Symbol",
    getQuote: "Get Quote",
    loading: "Loading...",
    analyzing: "Analyzing...",
    aiAnalyze: "AI Analyze",
    lastPrice: "Last Price",
    change: "Change",
    changePct: "Change %",
    volume: "Volume",
    marketSnapshot: "Market Snapshot",
    waiting: "Waiting for data",
    company: "Company",
    openHighLow: "Open / High / Low",
    previousClose: "Previous Close",
    updated: "Updated",
    savedToSupabase: "Saved to Supabase",
    notSaved: "Run AI analysis to store a record",
    structuredOutput: "Structured Output",
    aiResult: "AI Analysis Result",
    risk: "Risk",
    noAnalysis: "Click AI Analyze to show the model's strict JSON output here.",
    databaseRecords: "Database Records",
    recentHistory: "Recent Analysis History",
    noHistory:
      "No analysis records yet. Run AI Analyze once to save a record into Supabase.",
    unknown: "Unknown",
    toggle: "中文",
    viewJson: "View JSON",
    close: "Close",
  },
  zh: {
    badge: "AI 股票研究演示",
    title: "AI 股票分析面板",
    description:
      "输入股票代码，获取免费行情快照，让 AI 返回严格结构的 JSON 分析结果，并保存结果到 Supabase。",
    symbol: "股票代码",
    getQuote: "获取行情",
    loading: "获取中...",
    analyzing: "分析中...",
    aiAnalyze: "AI 分析",
    lastPrice: "最新价",
    change: "涨跌额",
    changePct: "涨跌幅",
    volume: "成交量",
    marketSnapshot: "行情快照",
    waiting: "等待数据",
    company: "公司名称",
    openHighLow: "开盘 / 最高 / 最低",
    previousClose: "昨收",
    updated: "更新时间",
    savedToSupabase: "已保存至 Supabase",
    notSaved: "运行 AI 分析以保存记录",
    structuredOutput: "结构化输出",
    aiResult: "AI 分析结果",
    risk: "风险",
    noAnalysis: "点击 AI 分析，在此查看模型返回的严格 JSON 输出。",
    databaseRecords: "数据库记录",
    recentHistory: "最近分析历史",
    noHistory: "暂无分析记录。运行一次 AI 分析即可保存到 Supabase。",
    unknown: "未知",
    toggle: "EN",
    viewJson: "查看 JSON",
    close: "关闭",
  },
} as const;

const SENTIMENT_ZH: Record<string, string> = {
  Bullish: "看涨",
  Neutral: "中性",
  Bearish: "看跌",
};

const RISK_ZH: Record<string, string> = {
  Low: "低",
  Medium: "中",
  High: "高",
};

function sentimentLabel(value: StockAnalysis["sentiment"], lang: Lang) {
  return lang === "zh" ? SENTIMENT_ZH[value] ?? value : value;
}

function riskLabel(value: StockAnalysis["risk_level"], lang: Lang) {
  return lang === "zh" ? RISK_ZH[value] ?? value : value;
}

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

function formatDate(value: string | null, lang: Lang) {
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const unknown = I18N[lang].unknown;

  if (!value) {
    return unknown;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const timestamp =
      numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue;
    const unixDate = new Date(timestamp);

    if (!Number.isNaN(unixDate.getTime())) {
      return unixDate.toLocaleString(locale, {
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

  return date.toLocaleString(locale, {
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
  const [lang, setLang] = useState<Lang>("en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const retryCountRef = useRef<Record<string, number>>({});
  const [jsonOpen, setJsonOpen] = useState(false);

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

  const t = I18N[lang];

  function displayText(text: string) {
    if (lang === "en") {
      return text;
    }
    return translations[text] ?? text;
  }

  useEffect(() => {
    if (lang !== "zh") {
      return;
    }

    const texts: string[] = [];
    if (apiState.error) {
      texts.push(apiState.error);
    }
    if (quote?.name) {
      texts.push(quote.name);
    }
    if (quote?.exchange) {
      texts.push(quote.exchange);
    }
    if (analysis?.summary) {
      texts.push(analysis.summary);
    }
    history.forEach((record) => {
      if (record.analysis?.summary) {
        texts.push(record.analysis.summary);
      }
    });

    const missing = texts.filter(
      (text) => !translations[text] && !pendingRef.current.has(text),
    );

    missing.forEach((text) => {
      pendingRef.current.add(text);

      const tryTranslate = () => {
        fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLang: "zh" }),
        })
          .then(async (response) => {
            const data = (await response.json()) as {
              translated?: string;
              error?: string;
            };
            if (!response.ok || !data.translated) {
              throw new Error(data.error ?? "translation failed");
            }
            setTranslations((prev) => ({ ...prev, [text]: data.translated! }));
            delete retryCountRef.current[text];
          })
          .catch(() => {
            const count = retryCountRef.current[text] ?? 0;
            if (count < 2) {
              retryCountRef.current[text] = count + 1;
              window.setTimeout(() => tryTranslate(), 2000 * (count + 1));
            } else {
              delete retryCountRef.current[text];
            }
          })
          .finally(() => {
            if (retryCountRef.current[text] === undefined) {
              pendingRef.current.delete(text);
            }
          });
      };

      tryTranslate();
    });
  }, [lang, apiState.error, quote, analysis, history, translations]);

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
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                {t.badge}
              </span>
              <div className="relative z-30">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((open) => !open)}
                  aria-label="Switch language"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white/70 text-slate-700 transition hover:bg-white"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 5h9" />
                    <path d="M7.5 3v2" />
                    <path d="M11 5c0 4-3 7-7 8" />
                    <path d="M5 9c1 2.5 3.5 4 6 4.5" />
                    <path d="M13 20l4-10 4 10" />
                    <path d="M14.5 16.5h5" />
                  </svg>
                </button>
                {langMenuOpen ? (
                  <div className="absolute right-0 top-11 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setLang("en");
                        setLangMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        lang === "en"
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      English
                      {lang === "en" ? <span className="text-teal-600">✓</span> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLang("zh");
                        setLangMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        lang === "zh"
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      中文
                      {lang === "zh" ? <span className="text-teal-600">✓</span> : null}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                {t.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                {t.description}
              </p>
            </div>

            <form
              onSubmit={handleFetchQuote}
              className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-4 shadow-sm md:flex-row"
            >
              <label className="flex-1">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t.symbol}
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
                  {apiState.loadingQuote ? t.loading : t.getQuote}
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={apiState.loadingAnalysis}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {apiState.loadingAnalysis ? t.analyzing : t.aiAnalyze}
                </button>
              </div>
            </form>

            {apiState.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[var(--danger)]">
                {displayText(apiState.error)}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={t.lastPrice} value={quote ? `${formatNumber(quote.close)} ${quote.currency}` : "--"} />
              <MetricCard label={t.change} value={quote ? formatNumber(quote.change) : "--"} />
              <MetricCard label={t.changePct} value={quote ? formatPercent(quote.percentChange) : "--"} />
              <MetricCard label={t.volume} value={quote ? formatNumber(quote.volume, 0) : "--"} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-slate-950 p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-teal-200/80">
                  {t.marketSnapshot}
                </p>
                <h2 className="mt-2 text-3xl font-semibold">
                  {quote?.symbol ?? "----"}
                </h2>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                {quote?.exchange ? displayText(quote.exchange) : t.waiting}
              </div>
            </div>

            <dl className="grid gap-4 text-sm text-white/80">
              <DataRow
                label={t.company}
                value={quote?.name ? displayText(quote.name) : "--"}
              />
              <DataRow
                label={t.openHighLow}
                value={
                  quote
                    ? `${formatNumber(quote.open)} / ${formatNumber(quote.high)} / ${formatNumber(quote.low)}`
                    : "--"
                }
              />
              <DataRow
                label={t.previousClose}
                value={quote ? formatNumber(quote.previousClose) : "--"}
              />
              <DataRow
                label={t.updated}
                value={quote ? formatDate(quote.timestamp, lang) : "--"}
              />
              <DataRow
                label={t.savedToSupabase}
                value={lastSavedAt ? formatDate(lastSavedAt, lang) : t.notSaved}
              />
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
        <article className="flex h-[560px] flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                {t.structuredOutput}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {t.aiResult}
              </h3>
            </div>
            {analysis ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${sentimentTone(
                    analysis.sentiment,
                  )}`}
                >
                  {sentimentLabel(analysis.sentiment, lang)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${riskTone(
                    analysis.risk_level,
                  )}`}
                >
                  {t.risk}: {riskLabel(analysis.risk_level, lang)}
                </span>
                <button
                  type="button"
                  onClick={() => setJsonOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                    <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                  {t.viewJson}
                </button>
              </div>
            ) : null}
          </div>

          {analysis ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              <p className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-7 text-slate-700">
                {displayText(analysis.summary)}
              </p>
            </div>
          ) : (
            <EmptyState text={t.noAnalysis} />
          )}
        </article>

        <article className="flex h-[560px] flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              {t.databaseRecords}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              {t.recentHistory}
            </h3>
          </div>

          {history.length > 0 ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
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
                        {formatDate(record.created_at, lang)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${sentimentTone(
                          record.analysis.sentiment,
                        )}`}
                      >
                        {sentimentLabel(record.analysis.sentiment, lang)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${riskTone(
                          record.analysis.risk_level,
                        )}`}
                      >
                        {riskLabel(record.analysis.risk_level, lang)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {displayText(record.analysis.summary)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={t.noHistory} />
          )}
        </article>
      </section>

      {jsonOpen && analysis ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setJsonOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-base font-semibold text-slate-900">
                {t.aiResult} · JSON
              </p>
              <button
                type="button"
                onClick={() => setJsonOpen(false)}
                aria-label={t.close}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden bg-slate-950 p-5">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-emerald-200">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
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
