import { useState } from "react";
import { resolveFileUrl } from "../../utils/axiosInstance";

const BRAND_COLOR = "#8065E8";

interface AvatarProps {
  name: string;
  src?: string;
  online?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  className?: string;
}

function isDisplayableImageUrl(url?: string): boolean {
  if (!url) return false;
  return /^(https?:\/\/|blob:|data:|\/)/i.test(url);
}

export default function Avatar({
  name,
  src,
  online,
  size = "md",
  color,
  className = "",
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-20 h-20 text-2xl",
  };

  const initials = name ? name.substring(0, 2).toUpperCase() : "?";
  const resolvedSrc = src ? resolveFileUrl(src) : "";
  const showImage = isDisplayableImageUrl(src) && failedSrc !== src && resolvedSrc.length > 0;

  return (
    <div className="relative shrink-0">
      <div
        className={`${sizes[size]} ${className} flex items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10`}
        style={{ backgroundColor: color ?? BRAND_COLOR }}
      >
        {showImage ? (
          <img
            src={resolvedSrc}
            alt={name || "Avatar"}
            className="h-full w-full object-cover"
            onError={() => setFailedSrc(src ?? null)}
          />
        ) : (
          initials
        )}
      </div>

      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
            online ? "bg-green-400" : "bg-muted-foreground/50"
          }`}
          aria-label={online ? "Online" : "Offline"}
          role="img"
        />
      )}
    </div>
  );
}
