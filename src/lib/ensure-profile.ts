import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

function asRole(value: unknown): AppRole {
  return value === "recruiter" ? "recruiter" : "student";
}

export async function ensureProfile(userId: string) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.role) return existing.role;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const meta = user?.user_metadata ?? {};
  const role = asRole(meta["role"]);
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: user?.email ?? null,
      full_name: typeof meta["full_name"] === "string" ? meta["full_name"] : "",
      role,
      company_name: typeof meta["company_name"] === "string" ? meta["company_name"] : null,
    },
    { onConflict: "id" },
  );
  if (error) {
    const { data: retry } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return retry?.role ?? role;
  }
  return role;
}
