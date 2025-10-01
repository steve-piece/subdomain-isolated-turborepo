// apps/protected/app/actions/onboarding/setup.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CompleteOnboardingResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Complete organization onboarding
 * Updates organization details and marks onboarding as complete
 */
export async function completeOnboarding(
  formData: FormData
): Promise<CompleteOnboardingResponse> {
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

    // Only owners can complete onboarding
    if (userRole !== "owner") {
      return {
        success: false,
        message: "Only organization owners can complete onboarding",
      };
    }

    // Extract form data
    const orgName = formData.get("org-name")?.toString().trim();
    const description = formData.get("description")?.toString().trim();

    // Validate
    if (!orgName || orgName.length === 0) {
      return {
        success: false,
        message: "Organization name is required",
      };
    }

    if (orgName.length > 255) {
      return {
        success: false,
        message: "Organization name must be 255 characters or less",
      };
    }

    if (description && description.length > 1000) {
      return {
        success: false,
        message: "Description must be 1000 characters or less",
      };
    }

    // Update organization
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        company_name: orgName,
        description: description || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      Sentry.withScope((scope) => {
        scope.setTag("action", "complete_onboarding");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("onboarding_completion", {
          orgId,
          message: updateError.message,
        });
        Sentry.captureException(updateError);
      });

      return {
        success: false,
        message: "Failed to complete onboarding. Please try again.",
        error: updateError.message,
      };
    }

    // Revalidate paths
    revalidatePath(`/s/${subdomain}`);
    revalidatePath(`/s/${subdomain}/dashboard`);
    revalidatePath(`/s/${subdomain}/org-settings`);

    Sentry.logger.info("onboarding_completed", {
      userId: user.id,
      orgId,
      subdomain,
    });

    return {
      success: true,
      message: "Welcome aboard! Your organization is all set up.",
    };
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("action", "complete_onboarding");
      Sentry.captureException(error);
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
