// apps/protected/components/profile/profile-wrapper.tsx
/**
 * ✅ PHASE 2: Refactored profile wrapper - centralized auth
 * - Fetches own data using useTenantClaims
 * - No props needed from page
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { createClient } from "@workspace/supabase/client";
import {
  updateUserProfile,
  uploadProfileAvatar,
  removeProfileAvatar,
} from "@/app/actions/profile";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useToast } from "@workspace/ui/components/toast";
import { Pencil, Check, X, Camera, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import Image from "next/image";
import { PageHeader } from "@/components/shared/page-header";

interface ProfileWrapperProps {
  subdomain: string;
}

interface UserProfile {
  full_name?: string;
  bio?: string;
  timezone?: string;
  profile_picture_url?: string | null;
}

export function ProfileWrapper({ subdomain }: ProfileWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("full_name, bio, timezone, profile_picture_url")
          .eq("user_id", claims.user_id)
          .single();

        if (data) {
          setProfile(data);
          setName(data.full_name || claims.full_name || "");
          setBio(data.bio || "");
          setAvatarUrl(data.profile_picture_url || null);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [claims.user_id, claims.full_name, supabase]);

  if (isLoadingProfile) {
    return (
      <div className="space-y-6 max-w-4xl">
        {/* Profile Header Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-7 bg-muted rounded animate-pulse w-48 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar Section Skeleton */}
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Form Fields Skeleton */}
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-10 bg-muted rounded-lg animate-pulse w-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-40 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded animate-pulse w-32" />
                    <div className="h-3 bg-muted rounded animate-pulse w-48" />
                  </div>
                  <div className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSaveName() {
    setIsLoading(true);
    try {
      const result = await updateUserProfile({
        full_name: name || undefined,
      });

      if (result.success) {
        addToast({
          title: "Success",
          description: "Name updated successfully",
          variant: "success",
        });
        setIsEditingName(false);
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveBio() {
    setIsLoading(true);
    try {
      const result = await updateUserProfile({
        bio: bio || undefined,
      });

      if (result.success) {
        addToast({
          title: "Success",
          description: "Bio updated successfully",
          variant: "success",
        });
        setIsEditingBio(false);
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadProfileAvatar(formData);

      if (result.success && result.url) {
        setAvatarUrl(result.url);
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveAvatar() {
    setIsUploadingAvatar(true);
    try {
      const result = await removeProfileAvatar();

      if (result.success) {
        setAvatarUrl(null);
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to remove avatar",
        variant: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function handleCancelName() {
    setName(profile?.full_name || claims.full_name || "");
    setIsEditingName(false);
  }

  function handleCancelBio() {
    setBio(profile?.bio || "");
    setIsEditingBio(false);
  }

  const initials = (name || claims.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="space-y-6">
        {/* Profile Header Card */}
        <Card className="border-none shadow-sm">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className="h-32 w-32 rounded-full overflow-hidden bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={name || "Profile picture"}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-primary-foreground">
                        {initials}
                      </span>
                    )}
                  </div>

                  {/* Avatar Upload/Remove Overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                        aria-label="Upload profile picture"
                      >
                        {isUploadingAvatar ? (
                          <Upload className="h-5 w-5 animate-pulse" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </button>
                      {avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors disabled:opacity-50"
                          aria-label="Remove profile picture"
                        >
                          <Trash2 className="h-5 w-5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="w-full max-w-md">
                  {!isEditingName ? (
                    <button
                      type="button"
                      className="group relative inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                      onClick={() => setIsEditingName(true)}
                    >
                      <h1 className="text-3xl font-bold">
                        {name || "Add your name"}
                      </h1>
                      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="text-2xl font-bold text-center"
                        autoFocus
                        disabled={isLoading}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveName}
                        disabled={isLoading}
                        className="shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelName}
                        disabled={isLoading}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <p className="text-muted-foreground">{claims.email}</p>

                {/* Bio */}
                <div className="w-full max-w-2xl">
                  {!isEditingBio ? (
                    <div
                      className="group relative cursor-pointer px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors min-h-[60px] flex items-center justify-center"
                      onClick={() => setIsEditingBio(true)}
                    >
                      <p className="text-muted-foreground text-center leading-relaxed">
                        {bio || "Add a bio to tell others about yourself..."}
                      </p>
                      <Pencil className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        autoFocus
                        disabled={isLoading}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelBio}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveBio}
                          disabled={isLoading}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {isLoading ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Context */}
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-semibold">
                    {claims.company_name || subdomain}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Subdomain</p>
                  <p className="font-mono text-sm font-medium">{subdomain}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                    {claims.user_role}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </>
  );
}
