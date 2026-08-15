import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";

// Runs once/day (see vercel.json). Fetches a price for every active shared instrument
// and writes ONE row per instrument into price_history — that's the only write this job
// makes. Per-user accrued amounts are computed on read via the fn_accrued_amount SQL
// function, so nothing user-specific needs to happen here.
//
// NOTE ON SCRAPING: investing.com / stockanalysis.com don't offer a public JSON API, so
// this parses their HTML with regex. That's the most fragile part of this whole system —
// if a source changes its markup, that instrument's fetch will fail (and the code below
// falls back to "no price today" rather than crashing the whole run). Check Vercel's
// function logs after the first few real runs and adjust the regex here if a source breaks.

function isWeekend(d: Date) {
  const day = d.getUTCDay(); // IST vs UTC drift is a known simplification here
  return day === 0 || day === 6;
}

function mmddyyyy(d: Date) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mm}${dd}${yyyy}`;
}

async function fetchPrice(sourceTemplate: string, date: Date): Promise<{ price: number; changePct: number } | null> {
  const url = sourceTemplate.replace("{MMDDYYYY}", mmddyyyy(date));
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DipBuyBot/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // stockanalysis.com history table: first data row is "| Date | Open | High | Low | Close | Adj Close | Change | Volume |"
    const saRow = html.match(/\|\s*[A-Za-z]{3}\s\d{1,2},\s\d{4}\s*\|[^\n]*\|[^\n]*\|[^\n]*\|\s*([\d,]+\.\d+)\s*\|[^\n]*\|\s*(-?[\d.]+)%/);
    if (saRow) {
      return { price: parseFloat(saRow[1].replace(/,/g, "")), changePct: parseFloat(saRow[2]) };
    }

    // investing.com history table: similar shape, close price then % change column
    const invRow = html.match(/([\d,]+\.\d+)\s*\n?\s*[\d,.]+\s*\n?\s*[\d,.]+\s*\n?\s*(-?[\d.]+)%/);
    if (invRow) {
      return { price: parseFloat(invRow[1].replace(/,/g, "")), changePct: parseFloat(invRow[2]) };
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const weekend = isWeekend(today);

  const { data: instruments, error } = await supabase.from("instruments").select("*").eq("active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: any[] = [];

  for (const inst of instruments ?? []) {
    if (weekend) {
      await supabase.from("price_history").upsert({
        instrument_code: inst.code,
        date: todayISO,
        day_type: "weekend",
        price: null,
        prev_close: null,
        change_pct: null,
        direction: null,
      });
      results.push({ code: inst.code, status: "weekend" });
      continue;
    }

    const fetched = await fetchPrice(inst.source_template, today);
    if (!fetched) {
      results.push({ code: inst.code, status: "fetch_failed" });
      continue;
    }

    const direction = fetched.changePct >= 0 ? "UP" : "DOWN";
    await supabase.from("price_history").upsert({
      instrument_code: inst.code,
      date: todayISO,
      day_type: "trading",
      price: fetched.price,
      change_pct: fetched.changePct,
      direction,
    });
    results.push({ code: inst.code, status: "ok", price: fetched.price, direction });
  }

  return NextResponse.json({ date: todayISO, weekend, results });
}
