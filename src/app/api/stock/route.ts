import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuote } from "@/lib/stock";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();

  if (!symbol) {
    return NextResponse.json(
      { error: "Query parameter 'symbol' is required." },
      { status: 400 },
    );
  }

  try {
    const quote = await fetchStockQuote(symbol);
    return NextResponse.json({ quote });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stock data.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
