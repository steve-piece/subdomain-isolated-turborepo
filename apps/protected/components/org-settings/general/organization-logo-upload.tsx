// apps/protected/components/organization-logo-upload.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";
import { useToast } from "@workspace/ui/components/toast";
import { Info } from "lucide-react";
import {
  uploadOrganizationLogo,
  removeOrganizationLogo,
} from "@actions/onboarding";

interface OrganizationLogoUploadProps {
  currentLogoUrl: string | null;
  organizationName: string;
}

export function OrganizationLogoUpload({
  currentLogoUrl,
  organizationName,
}: OrganizationLogoUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleFileUpload = async (file: File) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await uploadOrganizationLogo(formData);

      if (result.success && result.url) {
        setLogoUrl(result.url);
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file);
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Button clicked");
    console.log("fileInputRef.current:", fileInputRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    handleFileUpload(file);
  };

  const handleRemove = async () => {
    startTransition(async () => {
      const result = await removeOrganizationLogo();

      if (result.success) {
        setLogoUrl(null);
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    });
  };

  return (
    <div className="flex items-start gap-6">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isPending && fileInputRef.current?.click()}
        className={`relative h-24 w-24 overflow-hidden rounded-lg border-2 shadow-sm cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/10 scale-105"
            : logoUrl
              ? "border-border bg-muted hover:border-primary"
              : "border-dashed border-muted-foreground/30 hover:border-primary bg-gradient-to-br from-primary to-primary/60"
        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        title={
          logoUrl
            ? "Click or drag to replace logo"
            : "Click or drag to upload logo"
        }
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${organizationName} logo`}
            fill
            className="object-contain p-0"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">
              {organizationName?.charAt(0)?.toUpperCase() || "O"}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {isDragging ? (
              <span className="text-primary font-medium">
                Drop file to upload
              </span>
            ) : (
              "Click logo or drag & drop. SVG, PNG, JPG or WebP. Max 5MB."
            )}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Logo updates in the sidebar will appear on your next login
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
            disabled={isPending}
            type="button"
          >
            {isPending ? "Uploading..." : "Upload Logo"}
          </Button>
          {logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={isPending}
            >
              Remove
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
          onChange={handleFileChange}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
