import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SECRET_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY must be set for server access"
  );
}

const client = createSupabaseClient(supabaseUrl, serviceRoleKey);

export function getServiceRoleClient() {
  return client;
}
