// apps/protected/app/actions/profile/avatar.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UploadAvatarResponse {
  success: boolean;
  message: string;
  url?: string;
  error?: string;
}

/**
 * Upload user profile avatar to Supabase Storage
 * Users can upload their own avatar
 */
export async function uploadProfileAvatar(
  formData: FormData,
): Promise<UploadAvatarResponse> {
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

    // Get user claims for subdomain
    const { data: claims } = await supabase.auth.getClaims();
    const subdomain = claims?.claims.subdomain;

    // Get the file from FormData
    const file = formData.get("avatar") as File;

    console.log("📸 [Avatar Upload] File received:", {
      hasFile: !!file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
    });

    if (!file || !(file instanceof File)) {
      console.error("❌ [Avatar Upload] No valid file provided");
      return {
        success: false,
        message: "No file provided",
      };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      console.error("❌ [Avatar Upload] Invalid file type:", file.type);
      return {
        success: false,
        message: "Invalid file type. Please upload a JPG, PNG, or WebP image.",
      };
    }

    // Validate file size (2MB max for avatars)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      console.error("❌ [Avatar Upload] File too large:", file.size);
      return {
        success: false,
        message: "File too large. Maximum size is 2MB.",
      };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    console.log("📝 [Avatar Upload] Generated filename:", fileName);

    // Delete old avatar if it exists
    const { data: oldProfile } = await supabase
      .from("user_profiles")
      .select("profile_picture_url")
      .eq("user_id", user.id)
      .single();

    if (oldProfile?.profile_picture_url) {
      // Extract path from URL
      try {
        const oldPath = oldProfile.profile_picture_url
          .split("/")
          .slice(-2)
          .join("/");
        await supabase.storage.from("profile-avatars").remove([oldPath]);
      } catch (error) {
        // Continue if old file doesn't exist
        Sentry.logger.warn("old_avatar_removal_failed", {
          userId: user.id,
          error,
        });
      }
    }

    // Upload file to Supabase Storage
    console.log("☁️ [Avatar Upload] Uploading to Supabase Storage...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ [Avatar Upload] Supabase upload failed:", {
        error: uploadError,
        message: uploadError.message,
      });

      Sentry.withScope((scope) => {
        scope.setTag("action", "upload_profile_avatar");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("avatar_upload", {
          message: uploadError.message,
          error: uploadError,
        });
        Sentry.captureException(uploadError);
      });

      return {
        success: false,
        message: "Failed to upload avatar. Please try again.",
        error: uploadError.message,
      };
    }

    console.log("✅ [Avatar Upload] Upload successful:", uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        profile_picture_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      Sentry.withScope((scope) => {
        scope.setTag("action", "update_profile_avatar_url");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("avatar_url_update", {
          message: updateError.message,
        });
        Sentry.captureException(updateError);
      });

      // Clean up uploaded file
      await supabase.storage.from("profile-avatars").remove([uploadData.path]);

      return {
        success: false,
        message: "Failed to save avatar URL. Please try again.",
        error: updateError.message,
      };
    }

    // Revalidate profile page
    if (subdomain) {
      revalidatePath(`/s/${subdomain}/profile`);
    }

    Sentry.logger.info("profile_avatar_uploaded", {
      userId: user.id,
      avatarUrl: publicUrl,
    });

    return {
      success: true,
      message: "Avatar uploaded successfully!",
      url: publicUrl,
    };
  } catch (error) {
    console.error("💥 [Avatar Upload] Unexpected error:", error);

    Sentry.withScope((scope) => {
      scope.setTag("action", "upload_profile_avatar");
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
 * Remove user profile avatar
 */
export async function removeProfileAvatar(): Promise<UploadAvatarResponse> {
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

    // Get user claims for subdomain
    const { data: claims } = await supabase.auth.getClaims();
    const subdomain = claims?.claims.subdomain;

    // Get current avatar URL
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("profile_picture_url")
      .eq("user_id", user.id)
      .single();

    if (!profile?.profile_picture_url) {
      return {
        success: false,
        message: "No avatar to remove",
      };
    }

    // Extract path from URL
    const path = profile.profile_picture_url.split("/").slice(-2).join("/");

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("profile-avatars")
      .remove([path]);

    if (deleteError) {
      Sentry.captureException(deleteError);
      // Continue anyway - the URL removal is more important
    }

    // Remove URL from database
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        profile_picture_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      Sentry.captureException(updateError);
      return {
        success: false,
        message: "Failed to remove avatar. Please try again.",
      };
    }

    // Revalidate profile page
    if (subdomain) {
      revalidatePath(`/s/${subdomain}/profile`);
    }

    return {
      success: true,
      message: "Avatar removed successfully!",
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
