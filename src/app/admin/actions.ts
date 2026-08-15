"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admins only.");
  return { supabase, user };
}

export async function updateInstrument(code: string, fields: {
  display_name?: string;
  ticker?: string;
  source_template?: string;
  in_base_pack?: boolean;
  active?: boolean;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("instruments")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("code", code);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addInstrument(input: {
  code: string;
  display_name: string;
  ticker: string;
  source_template: string;
  in_base_pack: boolean;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("instruments").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
