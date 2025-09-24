#!/usr/bin/env node

/**
 * Integration test for organization signup flow
 * - Creates an auth user (signUp)
 * - Verifies profile trigger
 * - Attempts org + tenant creation (requires session)
 *
 * Notes:
 * - If your project requires email confirmation, signUp will NOT create a session.
 *   In that case the org creation step will fail (as expected) with RLS.
 * - This test reports precisely where the flow breaks so you can adjust config
 *   or server action behavior accordingly.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFallback() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    content
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith("#"))
      .forEach((line) => {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) return;
        const key = m[1];
        let val = m[2];
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] == null) process.env[key] = val;
      });
  } catch {
    // ignore
  }
}

// Ensure env vars are present
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
) {
  loadEnvFallback();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function logStep(title) {
  console.log(`\n=== ${title} ===`);
}

function redact(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function main() {
  const ts = Date.now();
  const emailDomain = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || "example.com";
  const email = `itest-${ts}@${emailDomain}`;
  const password = "P@ssword12345";
  const userName = "ITest User";
  const organizationName = `ITest Org ${ts}`;
  const subdomain = `itest${ts}`.slice(0, 15);

  console.log(
    "Starting signup integration test with:",
    redact({ email, userName, organizationName, subdomain })
  );

  // Step 1: signUp
  logStep("Step 1: Auth signUp");
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userName,
        organization_name: organizationName,
        subdomain,
        role: "owner",
      },
    },
  });

  if (authError) {
    console.error("❌ signUp failed:", authError);
    process.exit(1);
  }
  if (!authData?.user) {
    console.error("❌ signUp returned no user");
    process.exit(1);
  }
  console.log("✅ signUp ok. userId:", authData.user.id);

  // Step 2: profile by trigger
  logStep("Step 2: Check profile trigger");
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("uid, full_name, role")
    .eq("uid", authData.user.id)
    .single();
  if (profileErr || !profile) {
    console.error("❌ user_profiles missing:", profileErr);
    // continue; don't hard fail, but flag
  } else {
    console.log("✅ profile present:", profile);
  }

  // Step 3: check session (if email confirmation required, session will be null)
  logStep("Step 3: Check session");
  const { data: sessionRes } = await supabase.auth.getSession();
  const hasSession = Boolean(sessionRes?.session);
  console.log("Session present:", hasSession);

  // Step 4: attempt org creation (simulates server action outcome with RLS)
  logStep("Step 4: Attempt org creation (RLS requires session)");
  const { data: orgData, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      company_name: organizationName,
      subdomain,
      owner_id: authData.user.id,
      settings: {},
      metadata: {},
    })
    .select()
    .maybeSingle();

  if (orgErr) {
    console.error(
      "❌ org insert failed (expected if no session):",
      orgErr.message
    );
    if (!hasSession) {
      console.error(
        "ℹ️ No session after signUp. If email confirmation is required, org creation must be deferred until after login."
      );
      process.exit(2);
    } else {
      process.exit(1);
    }
  }

  if (!orgData) {
    console.error("❌ org insert returned no data");
    process.exit(1);
  }
  console.log("✅ org created:", {
    id: orgData.id,
    subdomain: orgData.subdomain,
  });

  // Step 5: tenant creation
  logStep("Step 5: Tenant creation");
  const { data: tenantData, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      id: orgData.id,
      company_name: organizationName,
      searchable: true,
    })
    .select()
    .maybeSingle();

  if (tenantErr) {
    console.error("❌ tenant insert failed:", tenantErr.message);
    process.exit(1);
  }
  console.log("✅ tenant created:", {
    id: tenantData?.id,
    subdomain: tenantData?.subdomain,
  });

  // Cleanup
  logStep("Cleanup");
  await supabase.from("tenants").delete().eq("id", orgData.id);
  await supabase.from("organizations").delete().eq("id", orgData.id);
  await supabase.from("user_profiles").delete().eq("uid", authData.user.id);
  // Can't delete auth user with anon key; leave it as test artifact
  console.log("✅ Cleanup done (auth user remains for audit)");

  console.log("\n🎉 Integration test completed");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Test crash:", e);
  process.exit(1);
});
