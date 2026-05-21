import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("stock_analyses")
      .select("id, symbol, provider, market_data, analysis, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (symbol) {
      query = query.eq("symbol", symbol);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return NextResponse.json({ records: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load history.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
