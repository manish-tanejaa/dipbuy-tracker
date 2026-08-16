import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: instruments }, { data: allProfiles }, { data: allConfig }] = await Promise.all([
    supabase.from("instruments").select("*").order("display_name"),
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("user_instrument_config").select("user_id, instrument_code, entity_label").lte("start_date", today).gte("end_date", today).eq("active", true),
  ]);

  // per-instrument tracker counts (distinct users, regardless of how many labels they track it under)
  const trackerCounts: Record<string, number> = {};
  const trackerUsersByInstrument: Record<string, Set<string>> = {};
  (allConfig ?? []).forEach((row) => {
    if (!trackerUsersByInstrument[row.instrument_code]) trackerUsersByInstrument[row.instrument_code] = new Set();
    trackerUsersByInstrument[row.instrument_code].add(row.user_id);
  });
  Object.entries(trackerUsersByInstrument).forEach(([code, userSet]) => {
    trackerCounts[code] = userSet.size;
  });

  // total accrued per user (sums across their currently-tracked instrument+label segments)
  const accruedByUser: Record<string, number> = {};
  await Promise.all(
    (allConfig ?? []).map(async (row) => {
      const { data } = await supabase.rpc("fn_accrued_amount", {
        p_user_id: row.user_id,
        p_instrument_code: row.instrument_code,
        p_as_of: today,
        p_entity_label: row.entity_label,
      });
      accruedByUser[row.user_id] = (accruedByUser[row.user_id] || 0) + Number(data ?? 0);
    })
  );

  const users = (allProfiles ?? []).map((p) => ({
    ...p,
    trackedCount: (allConfig ?? []).filter((c) => c.user_id === p.id).length,
    totalAccrued: accruedByUser[p.id] || 0,
  }));

  return (
    <AdminClient
      instruments={instruments ?? []}
      trackerCounts={trackerCounts}
      users={users}
      totalUsers={(allProfiles ?? []).length}
    />
  );
}
