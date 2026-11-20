import { getMediaKind, tabs, type MediaItem, type MediaKind } from "./profileMedia";

interface MediaTabsProps {
  items: MediaItem[];
  activeTab: MediaKind;
  onChange: (kind: MediaKind) => void;
}

export default function MediaTabs({ items, activeTab, onChange }: MediaTabsProps) {
  return (
    <div className="mb-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-muted/70 p-1.5">
      {tabs.map(({ key, label, icon: Icon }) => {
        const count = items.filter((item) => getMediaKind(item) === key).length;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={activeTab === key}
            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              activeTab === key
                ? "bg-[#8065E8] text-white shadow-sm"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
            <span className="text-[10px] opacity-80">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
