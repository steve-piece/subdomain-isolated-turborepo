"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@actions/profile";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useToast } from "@workspace/ui/components/toast";
import { Pencil, Check, X, Camera, Trash2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";

interface ProfileViewProps {
  initialData: {
    fullName?: string;
    bio?: string;
    email: string;
    timezone?: string;
    organizationName: string;
    subdomain: string;
    role: string;
    userId: string;
  };
}

export function ProfileView({ initialData }: ProfileViewProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState(initialData.fullName || "");
  const [bio, setBio] = useState(initialData.bio || "");

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
    } catch (error) {
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
    } catch (error) {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancelName() {
    setName(initialData.fullName || "");
    setIsEditingName(false);
  }

  function handleCancelBio() {
    setBio(initialData.bio || "");
    setIsEditingBio(false);
  }

  const initials = (name || initialData.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Profile Picture */}
            <div className="relative group">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <span className="text-5xl font-bold text-primary-foreground">
                  {initials}
                </span>
              </div>
              <button
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Change profile picture"
              >
                <Camera className="h-8 w-8 text-white" />
              </button>
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
            <p className="text-muted-foreground">{initialData.email}</p>

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
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="font-semibold">{initialData.organizationName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Subdomain</p>
              <p className="font-mono text-sm font-medium">
                {initialData.subdomain}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Role</p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                {initialData.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-destructive">
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0 ml-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
