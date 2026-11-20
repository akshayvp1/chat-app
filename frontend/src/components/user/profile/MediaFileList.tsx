import { Download, FileText, Music2 } from "lucide-react";
import { resolveFileUrl } from "../../../utils/fileUrl";
import { formatSize, type MediaItem } from "./profileMedia";

interface MediaFileListProps {
  items: MediaItem[];
  kind: "audio" | "document";
}

export default function MediaFileList({ items, kind }: MediaFileListProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.itemId}
          className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEE9FF] text-[#8065E8] dark:bg-[#8065E8]/20 dark:text-[#C9BFFF]">
            {kind === "audio" ? <Music2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground" title={item.fileName}>
              {item.fileName}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatSize(item.size)}</p>
          </div>
          {kind === "audio" && (
            <audio src={resolveFileUrl(item.url)} controls preload="none" className="hidden w-40 sm:block" />
          )}
          <a
            href={resolveFileUrl(item.url)}
            download={item.fileName}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${item.fileName}`}
            title={`Download ${item.fileName}`}
            className="rounded-full p-2 text-muted-foreground hover:bg-[#EEE9FF] hover:text-[#8065E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-[#8065E8]/20"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      ))}
    </div>
  );
}
