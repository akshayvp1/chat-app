import { Video } from "lucide-react";
import { resolveFileUrl } from "../../../utils/fileUrl";
import type { MediaItem } from "./profileMedia";

interface MediaGridProps {
  items: MediaItem[];
  kind: "image" | "video";
}

export default function MediaGrid({ items, kind }: MediaGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <a
          key={item.itemId}
          href={resolveFileUrl(item.url)}
          target="_blank"
          rel="noopener noreferrer"
          title={item.fileName}
          className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
        >
          {kind === "image" ? (
            <img
              src={resolveFileUrl(item.url)}
              alt={item.fileName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <>
              <video src={resolveFileUrl(item.url)} className="h-full w-full object-cover" muted preload="metadata" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                <Video className="h-6 w-6" />
              </span>
            </>
          )}
        </a>
      ))}
    </div>
  );
}
