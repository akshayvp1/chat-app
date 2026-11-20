import { X } from "lucide-react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😊", "🙂", "😍", "🥰",
  "😂", "😉", "😎", "🤔", "👍", "👎", "👏", "🙏",
  "❤️", "🎉", "🔥", "✨", "💯", "😭", "😅", "🤝",
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="absolute bottom-full right-0 z-30 mb-2 w-[min(14rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg dark:border-border">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-muted-foreground">Emoji</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close emoji picker"
          title="Close emoji picker"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid max-h-52 grid-cols-6 gap-0.5 overflow-y-auto sm:grid-cols-8">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={`Insert ${emoji}`}
            className="flex h-8 items-center justify-center rounded-md text-base leading-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
