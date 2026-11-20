import Avatar from "../Avatar";
import type { MemberLike } from "./profileMedia";

interface MemberListProps {
  members: MemberLike[];
  onSelect: (member: MemberLike) => void;
}

export default function MemberList({ members, onSelect }: MemberListProps) {
  return (
    <div className="border-b border-border px-4 py-4 sm:px-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Members · {members.length}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <button
            key={member._id}
            type="button"
            onClick={() => onSelect(member)}
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-[#8065E8]/40 hover:bg-[#EEE9FF]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-[#8065E8]/10"
          >
            <Avatar name={member.name} src={member.profile} size="sm" color="#8065E8" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{member.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{member.email}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
