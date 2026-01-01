"use client";

import Image from "next/image";
import { useState } from "react";

interface CardThumbnailProps {
  src: string;
  alt: string;
  size?: number;
}

export function CardThumbnail({ src, alt, size = 60 }: CardThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
        style={{ width: size, height: size }}
      >
        <span className="font-medium text-xs">N/A</span>
      </div>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Image
        alt={alt}
        className="absolute inset-0 rounded-full object-cover"
        height={280}
        loading="lazy"
        onError={() => setImageError(true)}
        src={src}
        style={{
          objectPosition: "50% 16.67%",
          width: size,
          height: size,
        }}
        unoptimized
        width={200}
      />
    </div>
  );
}
