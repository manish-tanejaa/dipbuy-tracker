"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function addTrackedInstrument(
  instrumentCode: string,
  startDate: string,
  dailyAmount: number,
  entityLabel: string | null
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("user_instrument_config").insert({
    user_id: user.id,
    instrument_code: instrumentCode,
    start_date: startDate,
    daily_amount: dailyAmount,
    entity_label: entityLabel,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function removeTrackedInstrument(configId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("user_instrument_config").update({ active: false }).eq("id", configId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function changeDailyAmount(
  instrumentCode: string,
  effectiveDate: string,
  newAmount: number,
  entityLabel: string | null
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("user_instrument_config").insert({
    user_id: user.id,
    instrument_code: instrumentCode,
    start_date: effectiveDate,
    daily_amount: newAmount,
    entity_label: entityLabel,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function invest(instrumentCode: string, amount: number, date: string, entityLabel: string | null) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("investments").insert({
    user_id: user.id,
    instrument_code: instrumentCode,
    amount,
    date,
    entity_label: entityLabel,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function addEntityLabel(label: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("entity_labels").insert({ user_id: user.id, label });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function removeEntityLabel(labelId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("entity_labels").delete().eq("id", labelId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  revalidatePath("/");
}
