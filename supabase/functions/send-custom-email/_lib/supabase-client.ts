import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for send-custom-email"
  );
}

const supabase = createSupabaseClient(supabaseUrl, secretKey);

export function getServiceRoleClient() {
  return supabase;
}
