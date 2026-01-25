// apps/protected/components/onboarding-modal.tsx
"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, X, Sparkles, Building2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { useToast } from "@workspace/ui/components/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  completeOnboarding,
  uploadOrganizationLogo,
} from "@actions/onboarding";

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

interface OnboardingModalProps {
  organizationName: string;
  subdomain: string;
  onComplete: () => void;
}

export function OnboardingModal({
  organizationName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subdomain,
  onComplete,
}: OnboardingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [orgName, setOrgName] = useState(organizationName);
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [step, setStep] = useState<"welcome" | "details" | "logo">("welcome");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const validateAndSetFile = (file: File) => {
    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      addToast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, SVG, or WebP image.",
        variant: "error",
      });
      return false;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      addToast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "error",
      });
      return false;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
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

    validateAndSetFile(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!industry.trim()) {
      addToast({
        title: "Industry required",
        description: "Please enter your organization's industry",
        variant: "error",
      });
      return;
    }

    if (!companySize) {
      addToast({
        title: "Company size required",
        description: "Please select your company size",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      // First, upload logo if provided
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append("logo", logoFile);

        const logoResult = await uploadOrganizationLogo(logoFormData);
        if (!logoResult.success) {
          addToast({
            title: "Logo upload failed",
            description: logoResult.message,
            variant: "error",
          });
          return;
        }
      }

      // Then complete onboarding
      const formData = new FormData();
      formData.append("org-name", orgName);
      formData.append("description", description);
      formData.append("industry", industry);
      formData.append("company-size", companySize);

      const result = await completeOnboarding(formData);

      if (result.success) {
        addToast({
          title: "Success!",
          description: result.message,
          variant: "success",
        });
        onComplete();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    });
  };

  if (step === "welcome") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-gradient-to-br from-violet-500 to-purple-600 p-4 shadow-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome to {process.env.APP_NAME || "Your App"}!
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Let&apos;s set up your organization profile in just a few steps.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Organization Details
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Tell us about your organization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Upload className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Upload Logo
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Add your brand identity
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={() => setStep("details")}
              className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 text-white hover:from-violet-600 hover:to-purple-700"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Organization Details
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Help us get to know your organization better
          </p>

          <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-2 pb-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us about your organization..."
                maxLength={1000}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description.length}/1000 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Technology, Healthcare"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-size">Company Size *</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger id="company-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep("welcome")}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              onClick={() => setStep("logo")}
              disabled={!orgName.trim() || !industry.trim() || !companySize}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Upload Your Logo
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Add a logo to personalize your workspace (optional)
        </p>

        <div className="mt-6">
          {!logoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                  : "border-slate-300 hover:border-violet-500 dark:border-slate-600 dark:hover:border-violet-400"
              }`}
            >
              <Upload
                className={`h-12 w-12 transition-colors ${
                  isDragging
                    ? "text-violet-500"
                    : "text-slate-400 group-hover:text-violet-500 dark:text-slate-500"
                }`}
              />
              <p
                className={`mt-2 text-sm font-medium ${
                  isDragging
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {isDragging ? "Drop to upload" : "Click or drag to upload"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                SVG, PNG, JPG or WebP (max. 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </div>
          ) : (
            <div className="relative">
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain p-4"
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep("details")}
            disabled={isPending}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={isPending || !orgName.trim()}
            >
              {isPending ? "Setting up..." : "Skip"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !orgName.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
            >
              {isPending ? "Setting up..." : "Complete Setup"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
