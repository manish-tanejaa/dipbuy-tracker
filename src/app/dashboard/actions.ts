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

  // close out any currently-open segment(s) for this instrument/label that started
  // before the new effective date, so only one segment is active at a time and past
  // amounts stay intact in history.
  const cutoff = new Date(effectiveDate + "T00:00:00Z");
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  const endDateForOldSegments = cutoff.toISOString().slice(0, 10);

  let closeQuery = supabase
    .from("user_instrument_config")
    .update({ end_date: endDateForOldSegments })
    .eq("user_id", user.id)
    .eq("instrument_code", instrumentCode)
    .eq("active", true)
    .lt("start_date", effectiveDate)
    .gt("end_date", endDateForOldSegments);
  closeQuery = entityLabel ? closeQuery.eq("entity_label", entityLabel) : closeQuery.is("entity_label", null);
  const { error: closeError } = await closeQuery;
  if (closeError) throw new Error(closeError.message);

  // if a segment already starts exactly on the effective date (e.g. changing the amount
  // the same day tracking started), update it in place instead of inserting a duplicate —
  // otherwise this violates the unique (user_id, instrument_code, start_date) constraint.
  let existingQuery = supabase
    .from("user_instrument_config")
    .select("id")
    .eq("user_id", user.id)
    .eq("instrument_code", instrumentCode)
    .eq("start_date", effectiveDate);
  existingQuery = entityLabel ? existingQuery.eq("entity_label", entityLabel) : existingQuery.is("entity_label", null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await supabase
      .from("user_instrument_config")
      .update({ daily_amount: newAmount, active: true, end_date: "2099-12-31" })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("user_instrument_config").insert({
      user_id: user.id,
      instrument_code: instrumentCode,
      start_date: effectiveDate,
      daily_amount: newAmount,
      entity_label: entityLabel,
    });
    if (error) throw new Error(error.message);
  }

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
  const trimmed = label.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("entity_labels").insert({ user_id: user.id, label: trimmed });
  // ignore "already exists" (unique user_id+label constraint) instead of crashing the page
  if (error && error.code !== "23505") throw new Error(error.message);
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
