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

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * Format `YYYY-MM-DD` or `YYYYMMDD` without timezone shifts. Returns the raw
 * value when it is not a date (match ids can carry a free-form suffix).
 */
export function formatMatchDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : /^\d{8}$/.test(digits) && value.startsWith(digits.slice(0, 4))
      ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
      : null;
  if (!iso) return value;

  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) {
    return value;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
