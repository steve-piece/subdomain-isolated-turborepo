"use client";

import Link from "next/link";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { Button } from "@workspace/ui/components/button";

export function Header({ appName }: { appName: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex h-16 items-center justify-between px-4">
      <Link href="/" className="flex items-center space-x-2">
        <span className="font-bold text-xl" suppressHydrationWarning>
          {appName}
        </span>
      </Link>
      <nav className="flex items-center gap-4">
        <ThemeToggle />
        <Button variant="ghost" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Get Started</Link>
        </Button>
      </nav>
    </header>
  );
}
