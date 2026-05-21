import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { getRequiredEnv, getSupabaseServerKey } from "@/lib/env";

let supabaseAdmin:
  | ReturnType<typeof createClient<Database>>
  | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient<Database>(
      getRequiredEnv("SUPABASE_URL"),
      getSupabaseServerKey(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return supabaseAdmin;
}
