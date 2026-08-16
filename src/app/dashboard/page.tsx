import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PortfolioClient from "./PortfolioClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: allInstruments }, { data: myConfig }, { data: myLabels }, { data: myInvestments }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("instruments").select("*").eq("active", true).order("display_name"),
      supabase
        .from("user_instrument_config")
        .select("*")
        .eq("user_id", user.id)
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("active", true),
      supabase.from("entity_labels").select("*").eq("user_id", user.id).order("label"),
      supabase.from("investments").select("*").eq("user_id", user.id).order("date", { ascending: false }),
    ]);

  const trackedCodes = Array.from(new Set((myConfig ?? []).map((c) => c.instrument_code)));

  // full trading-day price history for every tracked instrument (used for the recommendation flag
  // and the per-instrument price history panel)
  const { data: allPriceHistory } = trackedCodes.length
    ? await supabase
        .from("price_history")
        .select("*")
        .in("instrument_code", trackedCodes)
        .eq("day_type", "trading")
        .order("date", { ascending: false })
    : { data: [] as any[] };

  const historyByCode: Record<string, any[]> = {};
  (allPriceHistory ?? []).forEach((row) => {
    if (!historyByCode[row.instrument_code]) historyByCode[row.instrument_code] = [];
    historyByCode[row.instrument_code].push(row);
  });

  // accrued amount per tracked (instrument, label) segment, computed server-side via the SQL function.
  const accruedByConfigId: Record<string, number> = {};
  await Promise.all(
    (myConfig ?? []).map(async (cfg) => {
      const { data } = await supabase.rpc("fn_accrued_amount", {
        p_user_id: user.id,
        p_instrument_code: cfg.instrument_code,
        p_as_of: today,
        p_entity_label: cfg.entity_label,
      });
      accruedByConfigId[cfg.id] = Number(data ?? 0);
    })
  );

  // total invested per (instrument, label) combination, to show alongside each tracked row
  const investedByKey: Record<string, number> = {};
  (myInvestments ?? []).forEach((inv) => {
    const key = `${inv.instrument_code}::${inv.entity_label ?? ""}`;
    investedByKey[key] = (investedByKey[key] || 0) + Number(inv.amount || 0);
  });

  const instrumentByCode: Record<string, any> = {};
  (allInstruments ?? []).forEach((i) => (instrumentByCode[i.code] = i));

  const tracked = (myConfig ?? []).map((cfg) => ({
    ...cfg,
    instrument: instrumentByCode[cfg.instrument_code],
    accrued: accruedByConfigId[cfg.id] ?? 0,
    invested: investedByKey[`${cfg.instrument_code}::${cfg.entity_label ?? ""}`] || 0,
    lastPrice: historyByCode[cfg.instrument_code]?.[0] ?? null,
    priceHistory: (historyByCode[cfg.instrument_code] ?? []).filter((r) => r.date >= cfg.start_date),
  }));

  return (
    <PortfolioClient
      profile={profile}
      tracked={tracked}
      entityLabels={myLabels ?? []}
      investments={myInvestments ?? []}
      today={today}
    />
  );
}
