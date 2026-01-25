// supabase/functions/send-email/_lib/supabase-client.js 
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceRoleClient = getServiceRoleClient;
const supabase_js_2_1 = require("https://esm.sh/@supabase/supabase-js@2");
const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server access");
}
const client = (0, supabase_js_2_1.createClient)(supabaseUrl, serviceRoleKey);
function getServiceRoleClient() {
    return client;
}
