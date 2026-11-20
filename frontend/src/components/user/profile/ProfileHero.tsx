import { Mail, Users } from "lucide-react";
import Avatar from "../Avatar";
import type { MemberLike, ProfileSubject } from "./profileMedia";

interface ProfileHeroProps {
  subject: ProfileSubject;
  member: MemberLike | null;
  online: boolean;
}

export default function ProfileHero({ subject, member, online }: ProfileHeroProps) {
  const displayName = member?.name ?? subject.name;
  const displayProfile = member?.profile ?? subject.profile;
  const displayEmail = member?.email ?? subject.email;

  return (
    <div className="flex flex-col items-center gap-3 border-b border-border px-5 py-6 text-center">
      {subject.isGroup && !member ? (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#8065E8] text-white shadow-lg shadow-[#8065E8]/25">
          <Users className="h-9 w-9" />
        </div>
      ) : (
        <div className="relative">
          <Avatar name={displayName} src={displayProfile} size="xl" color="#8065E8" />
          {!member && !subject.isGroup && online && (
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" />
          )}
        </div>
      )}

      <div>
        <p className="text-lg font-extrabold text-foreground">{displayName}</p>
        {displayEmail ? (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {displayEmail}
          </p>
        ) : null}
        {!member && subject.isGroup ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {subject.subtitle ?? `${subject.members?.length ?? 0} members`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
