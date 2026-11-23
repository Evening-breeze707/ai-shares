import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getRequiredEnv } from "@/lib/env";

type TranslateBody = {
  text?: string;
  targetLang?: "zh" | "en";
};

export async function POST(request: NextRequest) {
  let body: TranslateBody;

  try {
    body = (await request.json()) as TranslateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim();
  const targetLang = body.targetLang;

  if (!text || (targetLang !== "zh" && targetLang !== "en")) {
    return NextResponse.json(
      { error: "text and a valid targetLang (zh | en) are required." },
      { status: 400 },
    );
  }

  const target = targetLang === "zh" ? "Simplified Chinese" : "English";

  try {
    const openai = new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    const model =
      process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-5.4";

    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: `Translate the user's text into ${target}. Return only the translated text, no explanation, no quotes, no markdown.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const translated = response.choices[0]?.message?.content?.trim();

    return NextResponse.json({ translated: translated || text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Translation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
