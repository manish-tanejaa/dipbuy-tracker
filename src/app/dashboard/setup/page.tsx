import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SetupClient from "./SetupClient";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: allInstruments }, { data: myConfig }, { data: myLabels }] =
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
    ]);

  const instrumentByCode: Record<string, any> = {};
  (allInstruments ?? []).forEach((i) => (instrumentByCode[i.code] = i));

  const tracked = (myConfig ?? [])
    .map((cfg) => ({ ...cfg, instrument: instrumentByCode[cfg.instrument_code] }))
    .sort((a, b) => (a.instrument?.display_name ?? "").localeCompare(b.instrument?.display_name ?? ""));

  return (
    <SetupClient
      profile={profile}
      tracked={tracked}
      allInstruments={allInstruments ?? []}
      entityLabels={myLabels ?? []}
      today={today}
    />
  );
}
