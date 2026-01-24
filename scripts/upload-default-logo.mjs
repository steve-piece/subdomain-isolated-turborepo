#!/usr/bin/env node
/**
 * Upload default logo to Supabase storage
 * This logo will be used as the fallback when organizations don't have a logo set
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl =
  process.env.SUPABASE_URL || "https://qnbqrlpvokzgtfevnuzv.supabase.co";
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseKey) {
  console.error(
    "❌ SUPABASE_SECRET_KEY environment variable is required"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function uploadDefaultLogo() {
  try {
    console.log("📤 Uploading default logo to Supabase storage...");

    // Read the logo file
    const logoPath = join(
      __dirname,
      "../apps/protected/public/favicon-96x96.png"
    );
    const logoFile = readFileSync(logoPath);

    // Upload to the organization-logos bucket with a special path for defaults
    const { data, error } = await supabase.storage
      .from("organization-logos")
      .upload("defaults/logo.png", logoFile, {
        contentType: "image/png",
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error("❌ Upload failed:", error);
      process.exit(1);
    }

    console.log("✅ Logo uploaded successfully!");
    console.log("📍 Path:", data.path);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("organization-logos")
      .getPublicUrl("defaults/logo.png");

    console.log("🔗 Public URL:", urlData.publicUrl);
    console.log("\n💡 Use this URL as the default fallback in your app config");

    return urlData.publicUrl;
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

uploadDefaultLogo();
