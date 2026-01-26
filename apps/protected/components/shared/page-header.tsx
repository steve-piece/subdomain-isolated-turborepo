"use client";

import type { ReactElement } from "react";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

interface PageHeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  children,
  className,
}: PageHeaderProps): ReactElement {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 border-b bg-white transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        className,
      )}
    >
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
        {children}
      </div>
    </header>
  );
}
