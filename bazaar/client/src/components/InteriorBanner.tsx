import React, { useState } from "react";

/** Interior scene for a shop/landmark. Renders nothing if the image is missing (assets are generated separately). */
export const InteriorBanner: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = "" }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`w-full h-32 object-cover rounded-xl border border-[#d4a359]/30 shadow-inner ${className}`}
      draggable={false}
    />
  );
};
