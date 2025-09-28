// apps/protected/components/providers.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ToastProvider } from "@workspace/ui/components/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <ToastProvider>{children}</ToastProvider>
    </NextThemesProvider>
  );
}
