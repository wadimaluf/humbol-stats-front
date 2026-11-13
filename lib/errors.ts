import { BackendError } from "./api";

/** Human-readable Spanish message for a failed backend request. */
export function describeBackendError(error: unknown, resource: string): string {
  if (error instanceof BackendError) {
    if (error.code === "BACKEND_NOT_CONFIGURED") {
      return `La API no está configurada en este entorno. No pudimos cargar ${resource}.`;
    }
    if (error.code === "NETWORK_ERROR") {
      return `No pudimos conectar con la API. Revisá que el backend esté corriendo y volvé a intentar cargar ${resource}.`;
    }
    if (error.status === 404) {
      return `No encontramos ${resource}.`;
    }
    return `La API respondió con un error (${error.status}) al cargar ${resource}.`;
  }
  return `Ocurrió un error inesperado al cargar ${resource}.`;
}
