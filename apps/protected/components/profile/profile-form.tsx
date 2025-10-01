"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@actions/profile";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useToast } from "@workspace/ui/components/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

interface ProfileFormProps {
  defaultValues: {
    fullName?: string;
    bio?: string;
    email: string;
    timezone?: string;
  };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: defaultValues.fullName || "",
    bio: defaultValues.bio || "",
  });

  // Check if form has unsaved changes
  const isDirty =
    formValues.fullName !== (defaultValues.fullName || "") ||
    formValues.bio !== (defaultValues.bio || "");

  function handleCancel() {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      router.refresh();
    }
  }

  function handleConfirmDiscard() {
    setShowCancelDialog(false);
    setFormValues({
      fullName: defaultValues.fullName || "",
      bio: defaultValues.bio || "",
    });
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const bio = formData.get("bio") as string;

    try {
      const result = await updateUserProfile({
        full_name: full_name || undefined,
        bio: bio || undefined,
      });

      if (result.success) {
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
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formValues.fullName}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, fullName: e.target.value }))
            }
            placeholder="Enter your full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email changes require verification
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          name="bio"
          value={formValues.bio}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, bio: e.target.value }))
          }
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell us about yourself..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading}
          onClick={handleCancel}
          aria-label={
            isDirty ? "Cancel and discard changes" : "Cancel and go back"
          }
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
