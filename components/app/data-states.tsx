import Link from "next/link";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

interface ErrorStateProps {
  title?: string;
  description: ReactNode;
  /** Same-page URL to retry the request. */
  retryHref?: string;
  retryLabel?: string;
  className?: string;
}

/** Consistent inline error for server-side data fetches. */
export function ErrorState({
  title = "No se pudieron cargar los datos",
  description,
  retryHref,
  retryLabel = "Reintentar",
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {retryHref && (
          <p>
            <Link
              href={retryHref}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {retryLabel}
            </Link>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

/** Consistent empty state for screens without data yet. */
export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {actionHref && actionLabel && (
        <Button
          className="mt-2"
          variant="outline"
          nativeButton={false}
          render={<Link href={actionHref} />}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Shared container for page-level loading skeletons. */
export function PageSkeleton({
  maxWidth = "max-w-6xl",
  children,
}: {
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-10",
        maxWidth,
      )}
    >
      {children}
    </div>
  );
}
