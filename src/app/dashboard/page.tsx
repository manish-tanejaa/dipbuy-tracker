import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./DashboardClient";

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

  const trackedCodes = (myConfig ?? []).map((c) => c.instrument_code);

  // latest trading-day price per tracked instrument (for the recommendation flag)
  const { data: latestPrices } = trackedCodes.length
    ? await supabase
        .from("price_history")
        .select("*")
        .in("instrument_code", trackedCodes)
        .eq("day_type", "trading")
        .order("date", { ascending: false })
    : { data: [] as any[] };

  const latestByCode: Record<string, any> = {};
  (latestPrices ?? []).forEach((row) => {
    if (!latestByCode[row.instrument_code]) latestByCode[row.instrument_code] = row;
  });

  // accrued amount per tracked instrument, computed server-side via the SQL function
  const accruedByCode: Record<string, number> = {};
  await Promise.all(
    trackedCodes.map(async (code) => {
      const { data } = await supabase.rpc("fn_accrued_amount", {
        p_user_id: user.id,
        p_instrument_code: code,
        p_as_of: today,
      });
      accruedByCode[code] = Number(data ?? 0);
    })
  );

  const instrumentByCode: Record<string, any> = {};
  (allInstruments ?? []).forEach((i) => (instrumentByCode[i.code] = i));

  const tracked = (myConfig ?? []).map((cfg) => ({
    ...cfg,
    instrument: instrumentByCode[cfg.instrument_code],
    accrued: accruedByCode[cfg.instrument_code] ?? 0,
    lastPrice: latestByCode[cfg.instrument_code] ?? null,
  }));

  const untracked = (allInstruments ?? []).filter((i) => !trackedCodes.includes(i.code));

  return (
    <DashboardClient
      profile={profile}
      tracked={tracked}
      untracked={untracked}
      entityLabels={myLabels ?? []}
      investments={myInvestments ?? []}
      today={today}
    />
  );
}
