import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminInstrumentsClient from "./AdminInstrumentsClient";

export const dynamic = "force-dynamic";

export default async function AdminInstrumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: instruments }, { data: allConfig }, { data: allProfiles }, { data: allInvestments }, { data: allPriceHistory }] =
    await Promise.all([
      supabase.from("instruments").select("*").order("display_name"),
      supabase
        .from("user_instrument_config")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("active", true),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("investments").select("instrument_code, user_id, entity_label, amount"),
      supabase.from("price_history").select("*").eq("day_type", "trading").order("date", { ascending: false }),
    ]);

  const profileById: Record<string, any> = {};
  (allProfiles ?? []).forEach((p) => (profileById[p.id] = p));

  const lastPriceByCode: Record<string, any> = {};
  (allPriceHistory ?? []).forEach((row) => {
    if (!lastPriceByCode[row.instrument_code]) lastPriceByCode[row.instrument_code] = row;
  });

  // accrued amount per active config row, computed server-side
  const accruedByConfigId: Record<string, number> = {};
  await Promise.all(
    (allConfig ?? []).map(async (cfg) => {
      const { data } = await supabase.rpc("fn_accrued_amount", {
        p_user_id: cfg.user_id,
        p_instrument_code: cfg.instrument_code,
        p_as_of: today,
        p_entity_label: cfg.entity_label,
      });
      accruedByConfigId[cfg.id] = Number(data ?? 0);
    })
  );

  // invested per (user, instrument, label) key, from the full investments log
  const investedByUserKey: Record<string, number> = {};
  (allInvestments ?? []).forEach((inv) => {
    const key = `${inv.user_id}::${inv.instrument_code}::${inv.entity_label ?? ""}`;
    investedByUserKey[key] = (investedByUserKey[key] || 0) + Number(inv.amount || 0);
  });

  // total invested per instrument (all users, all time)
  const totalInvestedByCode: Record<string, number> = {};
  (allInvestments ?? []).forEach((inv) => {
    totalInvestedByCode[inv.instrument_code] = (totalInvestedByCode[inv.instrument_code] || 0) + Number(inv.amount || 0);
  });

  const instrumentsData = (instruments ?? []).map((instrument) => {
    const configRows = (allConfig ?? []).filter((c) => c.instrument_code === instrument.code);
    const trackerUserIds = new Set(configRows.map((c) => c.user_id));
    const totalDailyRate = configRows.reduce((s, c) => s + Number(c.daily_amount || 0), 0);
    const totalAccrued = configRows.reduce((s, c) => s + (accruedByConfigId[c.id] ?? 0), 0);
    const totalInvested = totalInvestedByCode[instrument.code] || 0;

    const perUser = configRows
      .map((c) => ({
        userId: c.user_id,
        displayName: profileById[c.user_id]?.display_name ?? "Unknown",
        label: c.entity_label,
        dailyAmount: Number(c.daily_amount || 0),
        startDate: c.start_date,
        accrued: accruedByConfigId[c.id] ?? 0,
        invested: investedByUserKey[`${c.user_id}::${instrument.code}::${c.entity_label ?? ""}`] || 0,
      }))
      .sort((a, b) => b.accrued - a.accrued);

    return {
      code: instrument.code,
      displayName: instrument.display_name,
      active: instrument.active,
      trackersCount: trackerUserIds.size,
      totalDailyRate,
      totalAccrued,
      totalInvested,
      lastPrice: lastPriceByCode[instrument.code] ?? null,
      perUser,
    };
  });

  return <AdminInstrumentsClient instruments={instrumentsData} />;
}
