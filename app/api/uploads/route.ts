import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "";

/**
 * Proxy the match upload form to the processing backend.
 * Accepts multipart/form-data:
 *   - video: binary (MP4), optional if youtubeUrl is present
 *   - youtubeUrl: string, optional
 *   - kickoffTimestamp: "mm:ss" where the match starts inside the video
 */
export async function POST(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "BACKEND_URL no está configurado en el entorno" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  try {
    const res = await fetch(`${BACKEND_URL}/matches`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `El backend rechazó la subida (HTTP ${res.status})` },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el backend de procesamiento" },
      { status: 502 },
    );
  }
}
