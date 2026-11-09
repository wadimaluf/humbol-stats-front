"use client";

import { useState, type ReactNode } from "react";

interface Props {
  src: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}

/**
 * Image with a graceful fallback for optional backend assets.
 * Backend asset endpoints may legitimately 404 for some matches (e.g. the
 * pitch image is only available for two of the four processed matches).
 */
export function AssetImage({ src, alt, className, fallback = null }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
