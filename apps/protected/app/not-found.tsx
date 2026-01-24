// apps/protected/app/not-found.tsx
import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Home, Search } from "lucide-react";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
export default function NotFound(): ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>404 - Page Not Found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Try searching for what you need or return home.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects">
                <Search className="h-4 w-4 mr-2" />
                Browse Projects
              </Link>
            </Button>
          </div>
          <EmptyDescription className="mt-4">
            Need help?{" "}
            <a href={`mailto:${supportEmail}`} className="font-medium">
              Contact support
            </a>
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    </div>
  );
}
