import OpenAI from "openai";
import { z } from "zod";
import { getRequiredEnv } from "@/lib/env";
import { StockAnalysis, StockQuote } from "@/lib/types";

const AnalysisSchema = z.object({
  summary: z.string().min(20, "summary should explain the outlook."),
  sentiment: z.enum(["Bullish", "Neutral", "Bearish"]),
  risk_level: z.enum(["Low", "Medium", "High"]),
});

let client: OpenAI | null = null;

const analysisModel =
  process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-5.4";

function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }

  return client;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeStockQuote(quote: StockQuote): Promise<StockAnalysis> {
  const openai = getOpenAIClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await openai.responses.create({
        model: analysisModel,
        temperature: 0.2,
        max_output_tokens: 220,
        instructions: [
          "You are an equity research assistant.",
          "Analyze the supplied market snapshot only.",
          "Return strict JSON only.",
          "Do not include markdown, code fences, or extra keys.",
          'Return exactly this shape: {"summary":"string","sentiment":"Bullish|Neutral|Bearish","risk_level":"Low|Medium|High"}.',
          "risk_level must reflect uncertainty and volatility risk.",
          "summary should be concise and decision-oriented.",
          "The summary must be natural English.",
        ].join(" "),
        input: `Analyze this stock quote snapshot:\n${JSON.stringify(quote, null, 2)}`,
      });

      const content = response.output_text?.trim();

      if (!content) {
        throw new Error("OpenAI returned an empty analysis response.");
      }

      return AnalysisSchema.parse(JSON.parse(content));
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await sleep(700 * attempt);
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "AI analysis request failed.";

  throw new Error(`AI analysis failed: ${message}`);
}

export const stockAnalysisSchema = AnalysisSchema;
