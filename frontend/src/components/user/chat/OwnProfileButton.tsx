import Avatar from "../Avatar";

interface OwnProfileButtonProps {
  name: string;
  profile?: string;
  onClick: () => void;
}

export default function OwnProfileButton({ name, profile, onClick }: OwnProfileButtonProps) {
  return (
    <div className="border-b border-border px-3 py-2 sm:px-4 dark:border-border">
      <button
        type="button"
        onClick={onClick}
        title="View my profile"
        aria-label="View my profile"
        className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar name={name || "Me"} src={profile} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          {name || "My profile"}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">View</span>
      </button>
    </div>
  );
}
