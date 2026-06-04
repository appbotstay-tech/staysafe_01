"use client";

import { useEffect, useState } from "react";

type EvidencePhotoProps = {
  primarySrc: string | null;
  fallbackSrc: string | null;
  alt: string;
  className?: string;
};

export function EvidencePhoto({
  primarySrc,
  fallbackSrc,
  alt,
  className
}: EvidencePhotoProps) {
  const [currentSrc, setCurrentSrc] = useState(primarySrc ?? fallbackSrc);
  const [fallbackUsed, setFallbackUsed] = useState(!primarySrc);
  const [unavailable, setUnavailable] = useState(!primarySrc && !fallbackSrc);

  useEffect(() => {
    setCurrentSrc(primarySrc ?? fallbackSrc);
    setFallbackUsed(!primarySrc);
    setUnavailable(!primarySrc && !fallbackSrc);
  }, [fallbackSrc, primarySrc]);

  if (unavailable || !currentSrc) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        Foto indisponível.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (!fallbackUsed && fallbackSrc && fallbackSrc !== currentSrc) {
          setCurrentSrc(fallbackSrc);
          setFallbackUsed(true);
          return;
        }

        setUnavailable(true);
      }}
    />
  );
}
