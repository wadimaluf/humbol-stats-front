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

const CALIBRATION_STATUS_LABELS: Record<string, string> = {
  fit: "ajustada",
  uncalibrated: "sin calibrar",
  pending: "pendiente",
};

/** User-facing Spanish label for the calibration status and approval. */
export function describeCalibrationLabel(
  status: string,
  approved: boolean,
): string {
  if (approved) {
    return "Aprobada";
  }
  if (status === "fit") {
    return "Ajustada · pendiente de aprobación";
  }
  return `Pendiente de revisión (${CALIBRATION_STATUS_LABELS[status] ?? status})`;
}
