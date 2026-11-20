import { useEffect, useRef } from "react";

import { Send } from "lucide-react";
import { BRAND_COLOR } from "../../../constants/brand";
import type {
  Group,
  GroupMember,
  GroupMessage,
} from "../../../types/types";
import { getSenderColor } from "../../../utils/senderColors";
import CallLogBubble from "../chat/CallLogBubble";
import MessageBubble from "../chat/MessageBubble";

interface GroupMessageListProps {
  group: Group;
  messages: GroupMessage[];
  currentUserId: string;
}

export default function GroupMessageList({
  group,
  messages,
  currentUserId,
}: GroupMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
      {messages.length > 0 ? (
        messages.map((message) => {
          const isMe = message.senderId === currentUserId;

          if (message.type === "call" && message.call) {
            return (
              <CallLogBubble
                key={message._id}
                call={message.call}
                createdAt={message.createdAt}
                variant="group"
              />
            );
          }

          const senderColor = getSenderColor(message.senderId);
          const sender: GroupMember | undefined = group.members.find(
            (member) => member._id === message.senderId,
          );

          return (
            <MessageBubble
              key={message._id}
              isMe={isMe}
              text={message.text}
              createdAt={message.createdAt}
              attachments={message.attachments}
              status={message.status}
              senderName={message.senderName}
              senderColor={senderColor}
              avatarName={message.senderName || "?"}
              avatarSrc={sender?.profile}
              avatarColor={senderColor}
            />
          );
        })
      ) : (
        <div className="mt-20 flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEE9FF] dark:bg-[#8065E8]/15">
            <Send className="h-5 w-5" style={{ color: BRAND_COLOR }} />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No messages yet
          </p>
          <p className="text-xs text-muted-foreground">Say hi to the group!</p>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
