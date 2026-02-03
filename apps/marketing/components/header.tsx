"use client";

import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { Button } from "@workspace/ui/components/button";

const GITHUB_REPO_URL = "https://github.com/steve-piece/subdomain-isolated-turborepo";

export function Header({ appName }: { appName: string }) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/logo_white.png" : "/logo_dark.png";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex h-16 items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src={logoSrc}
          alt={`${appName} logo`}
          width={40}
          height={40}
          priority
          className="size-10 rounded-full"
        />
        <span className="font-bold text-xl" suppressHydrationWarning>
          {appName}
        </span>
      </Link>
      <nav className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        </Button>
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
