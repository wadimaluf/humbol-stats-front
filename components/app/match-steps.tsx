import Link from "next/link";

const STEPS = [
  { key: "cancha", label: "Cancha", hrefPrefix: "/partidos" },
  { key: "roster", label: "Roster", hrefPrefix: "/roster" },
  { key: "dashboard", label: "Estadísticas", hrefPrefix: "" },
] as const;

/** Shared stepper for the post-processing review flow of a match. */
export function MatchSteps({ matchId, current }: { matchId: string; current: 0 | 1 | 2 }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const href =
          index === 2
            ? `/partidos/${matchId}`
            : `/partidos/${matchId}/${step.key}`;
        const isCurrent = index === current;
        const isDone = index < current;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <Link
              href={href}
              className={`rounded-full border px-3 py-1 transition-colors ${
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : isDone
                    ? "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground"
                    : "border-border text-muted-foreground/50 pointer-events-none"
              }`}
            >
              {isDone ? `${index + 1}. ${step.label} ✓` : `${index + 1}. ${step.label}`}
            </Link>
            {index < STEPS.length - 1 && <span className="text-muted-foreground/50">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
