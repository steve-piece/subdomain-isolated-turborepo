// apps/protected/app/actions/onboarding/logo.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UploadLogoResponse {
  success: boolean;
  message: string;
  url?: string;
  error?: string;
}

/**
 * Upload organization logo to Supabase Storage
 * Only organization owners and admins can upload logos
 */
export async function uploadOrganizationLogo(
  formData: FormData
): Promise<UploadLogoResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Get user claims for authorization
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claims) {
      return {
        success: false,
        message: "Unable to verify user claims",
      };
    }

    const userRole = claims.claims.user_role;
    const orgId = claims.claims.org_id;
    const subdomain = claims.claims.subdomain;

    // Check if user has permission to upload logo
    const allowedRoles = ["owner", "admin", "superadmin"];
    if (!allowedRoles.includes(userRole)) {
      Sentry.logger.warn("unauthorized_logo_upload_attempt", {
        userId: user.id,
        userRole,
        orgId,
      });
      return {
        success: false,
        message:
          "Insufficient permissions. Only owners and admins can upload logos.",
      };
    }

    // Get the file from FormData
    const file = formData.get("logo") as File;

    if (!file || !(file instanceof File)) {
      return {
        success: false,
        message: "No file provided",
      };
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        message:
          "Invalid file type. Please upload a JPG, PNG, SVG, or WebP image.",
      };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        message: "File too large. Maximum size is 5MB.",
      };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${orgId}/logo-${Date.now()}.${fileExt}`;

    // Delete old logo if it exists
    const { data: oldOrg } = await supabase
      .from("organizations")
      .select("logo_url")
      .eq("id", orgId)
      .single();

    if (oldOrg?.logo_url) {
      // Extract path from URL
      const oldPath = oldOrg.logo_url.split("/").slice(-2).join("/");
      await supabase.storage.from("organization-logos").remove([oldPath]);
    }

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("organization-logos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      Sentry.withScope((scope) => {
        scope.setTag("action", "upload_organization_logo");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("logo_upload", {
          orgId,
          message: uploadError.message,
        });
        Sentry.captureException(uploadError);
      });

      return {
        success: false,
        message: "Failed to upload logo. Please try again.",
        error: uploadError.message,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("organization-logos")
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Update organization with new logo URL
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        logo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      Sentry.withScope((scope) => {
        scope.setTag("action", "update_organization_logo_url");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("logo_url_update", {
          orgId,
          message: updateError.message,
        });
        Sentry.captureException(updateError);
      });

      // Clean up uploaded file
      await supabase.storage
        .from("organization-logos")
        .remove([uploadData.path]);

      return {
        success: false,
        message: "Failed to save logo URL. Please try again.",
        error: updateError.message,
      };
    }

    // Revalidate paths
    revalidatePath(`/s/${subdomain}/org-settings`);
    revalidatePath(`/s/${subdomain}/dashboard`);

    Sentry.logger.info("organization_logo_uploaded", {
      userId: user.id,
      orgId,
      subdomain,
      logoUrl: publicUrl,
    });

    return {
      success: true,
      message: "Logo uploaded successfully!",
      url: publicUrl,
    };
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("action", "upload_organization_logo");
      Sentry.captureException(error);
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Remove organization logo
 */
export async function removeOrganizationLogo(): Promise<UploadLogoResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Get user claims
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claims) {
      return {
        success: false,
        message: "Unable to verify user claims",
      };
    }

    const userRole = claims.claims.user_role;
    const orgId = claims.claims.org_id;
    const subdomain = claims.claims.subdomain;

    // Check permissions
    const allowedRoles = ["owner", "admin", "superadmin"];
    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        message:
          "Insufficient permissions. Only owners and admins can remove logos.",
      };
    }

    // Get current logo URL
    const { data: org } = await supabase
      .from("organizations")
      .select("logo_url")
      .eq("id", orgId)
      .single();

    if (!org?.logo_url) {
      return {
        success: false,
        message: "No logo to remove",
      };
    }

    // Extract path from URL
    const path = org.logo_url.split("/").slice(-2).join("/");

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("organization-logos")
      .remove([path]);

    if (deleteError) {
      Sentry.captureException(deleteError);
      // Continue anyway - the URL removal is more important
    }

    // Remove URL from database
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      Sentry.captureException(updateError);
      return {
        success: false,
        message: "Failed to remove logo. Please try again.",
      };
    }

    // Revalidate paths
    revalidatePath(`/s/${subdomain}/org-settings`);
    revalidatePath(`/s/${subdomain}/dashboard`);

    return {
      success: true,
      message: "Logo removed successfully!",
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
