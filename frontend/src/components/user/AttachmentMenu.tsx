import { useEffect, useRef, useState } from "react";
import { FileText, Image, Music2, Paperclip } from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  type AttachmentCategory,
} from "../../services/user/uploadService";

interface AttachmentMenuProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const options: {
  category: AttachmentCategory;
  label: string;
  hint: string;
  icon: typeof FileText;
}[] = [
  { category: "document", label: "Document", hint: "PDF, Word, Excel, ZIP", icon: FileText },
  { category: "media", label: "Image / Video", hint: "JPG, PNG, MP4, WebM", icon: Image },
  { category: "audio", label: "Song / Audio", hint: "MP3, WAV, M4A, OGG", icon: Music2 },
];

export default function AttachmentMenu({ onFiles, disabled = false }: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [accept, setAccept] = useState<string>(ATTACHMENT_ACCEPT.document);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function choose(category: AttachmentCategory) {
    const nextAccept = ATTACHMENT_ACCEPT[category];
    setAccept(nextAccept);
    setOpen(false);
    const input = inputRef.current;
    if (!input) return;
    input.accept = nextAccept;
    input.value = "";
    input.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) onFiles(files);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-label="Attach files"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Attach files"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#EEE9FF] hover:text-[#8065E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#8065E8]/20 dark:hover:text-[#C9BFFF]"
      >
        <Paperclip className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose attachment type"
          className="absolute bottom-full left-0 z-40 mb-2 w-60 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl"
        >
          {options.map(({ category, label, hint, icon: Icon }) => (
            <button
              key={category}
              type="button"
              role="menuitem"
              onClick={() => choose(category)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#EEE9FF] focus-visible:bg-[#EEE9FF] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring dark:hover:bg-[#8065E8]/20 dark:focus-visible:bg-[#8065E8]/20"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEE9FF] text-[#8065E8] dark:bg-[#8065E8]/20 dark:text-[#C9BFFF]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
