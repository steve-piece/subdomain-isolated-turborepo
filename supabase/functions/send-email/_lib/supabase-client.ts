// supabase/functions/send-email/_lib/supabase-client.ts 
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server access"
  );
}

const client = createSupabaseClient(supabaseUrl, serviceRoleKey);

export function getServiceRoleClient() {
  return client;
}
