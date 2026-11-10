const SPRINT_REASON_TRANSLATIONS: Record<string, string> = {
  "Sprint event export was not generated for this match.":
    "El motor no generó el export de eventos de sprint para este partido.",
};

/** User-facing Spanish description for a missing sprint export. */
export function describeSprintAvailability(reason: string | null): string {
  if (!reason) {
    return "Este partido no tiene eventos de sprint disponibles.";
  }
  return SPRINT_REASON_TRANSLATIONS[reason] ?? reason;
}
