"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Zap, Check, Lock } from "lucide-react";
import Link from "next/link";

interface UpgradePromptProps {
  feature: string;
  requiredTier: string;
  currentTier: string;
  description?: string;
  benefits?: string[];
}

export function UpgradePrompt({
  feature,
  requiredTier,
  currentTier,
  description,
  benefits = [],
}: UpgradePromptProps) {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{feature}</CardTitle>
          <CardDescription className="text-base">
            {description ||
              `This feature requires a ${requiredTier} subscription or higher`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-lg font-semibold capitalize">
                  {currentTier}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Required Plan</p>
                <p className="text-lg font-semibold text-primary">
                  {requiredTier}+
                </p>
              </div>
            </div>

            {benefits.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">
                  With {requiredTier}, you can:
                </p>
                <ul className="space-y-2">
                  {benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Link href="/org-settings/billing" className="flex-1">
                <Button className="w-full" size="lg">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to {requiredTier}
                </Button>
              </Link>
              <Link href="/org-settings">
                <Button variant="outline" size="lg">
                  Back to Settings
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What you&apos;re missing</CardTitle>
          <CardDescription>
            Unlock powerful features with {requiredTier}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative opacity-50 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-background/90 backdrop-blur-sm rounded-lg px-6 py-3 shadow-lg">
                <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Upgrade to unlock</p>
              </div>
            </div>
            <div className="blur-sm">
              <div className="space-y-3 p-6 border rounded-lg">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
