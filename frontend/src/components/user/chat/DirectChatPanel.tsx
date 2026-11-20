import type { RefObject } from "react";
import { ArrowLeft, MoreVertical, Phone, Send, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CallStatus } from "../../../hooks/useCall";
import type { MessageComposerResult } from "../../../hooks/useMessageComposer";
import { BRAND_COLOR } from "../../../constants/brand";
import type { ChatMessage, UserList } from "../../../types/types";
import Avatar from "../Avatar";
import CallLogBubble from "./CallLogBubble";
import MessageBubble from "./MessageBubble";
import MessageComposerInput from "./MessageComposerInput";

interface DirectChatPanelProps {
  selectedContact: UserList;
  messages: ChatMessage[];
  currentUserId: string;
  isTyping: boolean;
  online: boolean;
  callStatus: CallStatus;
  composer: MessageComposerResult;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onOpenProfile: () => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
}

export default function DirectChatPanel({
  selectedContact,
  messages,
  currentUserId,
  isTyping,
  online,
  callStatus,
  composer,
  messagesEndRef,
  onBack,
  onOpenProfile,
  onStartAudioCall,
  onStartVideoCall,
}: DirectChatPanelProps) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-3 shadow-sm sm:gap-3 sm:px-4 dark:border-border">
        <button
          type="button"
          onClick={onBack}
          className="mr-0.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
          title="Back to conversations"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          title="View profile"
          aria-label={`View ${selectedContact.name}'s profile`}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Avatar
            name={selectedContact.name}
            src={selectedContact.profile}
            online={online}
            size="md"
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {selectedContact.name}
          </p>

          <p className="truncate text-xs text-muted-foreground">
            {isTyping ? (
              <span className="italic text-[#8065E8] dark:text-[#C9BFFF]">
                typing...
              </span>
            ) : online ? (
              "Online"
            ) : (
              "Offline"
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onStartAudioCall}
            disabled={callStatus !== "idle"}
            title="Audio call"
            aria-label="Start audio call"
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onStartVideoCall}
            disabled={callStatus !== "idle"}
            title="Video call"
            aria-label="Start video call"
          >
            <Video className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onOpenProfile}
            title="View profile"
            aria-label="View profile"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
                  variant="direct"
                  isMe={isMe}
                />
              );
            }

            return (
              <MessageBubble
                key={message._id}
                isMe={isMe}
                text={message.text}
                createdAt={message.createdAt}
                attachments={message.attachments}
                status={message.status}
                avatarName={selectedContact.name}
                avatarSrc={selectedContact.profile}
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

            <p className="text-xs text-muted-foreground">
              Say hi to start the conversation!
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageComposerInput
        composer={composer}
        placeholder="Type a message..."
        ariaLabel="Message text"
      />
    </>
  );
}
