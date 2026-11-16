import { Suspense } from "react";
import { connection } from "next/server";

import { UploadForm } from "@/components/app/upload-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Cargar partido | Humbol Stats",
  description: "Registrá un partido desde un link de Google Drive",
};

function todayMatchId(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default function NewMatchPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-start justify-center px-4 py-10">
      <Suspense fallback={<UploadFormSkeleton />}>
        <MatchForm />
      </Suspense>
    </div>
  );
}

/**
 * The default match id is today's local date, so this subtree renders per
 * request instead of being prerendered with a stale date.
 */
async function MatchForm() {
  await connection();
  return <UploadForm defaultMatchId={todayMatchId()} />;
}

function UploadFormSkeleton() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-40" />
    </div>
  );
}
