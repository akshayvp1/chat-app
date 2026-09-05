// GroupChat.tsx
// Full group chat area — mirrors Chat.tsx structure but uses group socket events,
// groupMessages from Redux, and shows sender name on each message.

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import {
  setGroupMessages,
  addGroupMessage,
  replaceGroupMessage,
  markGroupMessageError,
} from "../../redux/slices/groupSlice";
import type { Group, GroupMessage } from "../../types/types";
import groupService from "@/services/user/groupService";
import { socket } from "@/socket/socket";

const BRAND_COLOR = "#5b7cfa";

function Avatar({
  initials,
  size = "md",
  color,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: color ?? BRAND_COLOR }}
    >
      {initials}
    </div>
  );
}

// Generate a consistent color per sender so each member has a unique bubble color
function getSenderColor(senderId: string): string {
  const colors = [
    "#e05c7a", "#e07a5f", "#3d405b", "#81b29a",
    "#f2cc8f", "#6a4c93", "#1982c4", "#8ac926",
  ];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface GroupChatProps {
  selectedGroup: Group;
  onBack: () => void;
}

export default function GroupChat({ selectedGroup, onBack }: GroupChatProps) {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((s) => s.auth.user?._id ?? "");
  const currentUserName = useAppSelector((s) => s.auth.user?.name ?? "");
  const groupMessages = useAppSelector((s) => s.group.groupMessages);

  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedGroupRef = useRef<Group | null>(null);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  // ── Fetch messages when group changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup) return;
    async function fetchMessages() {
      const res = await groupService.getGroupMessages(selectedGroup._id);
      if (res.success && res.data) {
        const loaded: GroupMessage[] = res.data.map((m) => ({
          ...m,
          status: "sent" as const,
        }));
        dispatch(setGroupMessages(loaded));
      }
    }
    fetchMessages();
  }, [selectedGroup._id, dispatch]);

  // ── Socket: join group room + listen for group events ────────────────────────
  useEffect(() => {
    if (!currentUserId || !selectedGroup) return;

    socket.emit("join_groups", [selectedGroup._id]);

    function onReceiveGroupMessage(payload: GroupMessage) {
      dispatch(addGroupMessage({ ...payload, status: "sent" }));
    }

    function onGroupMessageSent(payload: GroupMessage) {
      dispatch(replaceGroupMessage({ ...payload, status: "sent" }));
    }

    function onGroupMessageError({ tempId }: { tempId: string }) {
      dispatch(markGroupMessageError(tempId));
    }

    function onGroupTyping({ from, fromName }: { from: string; fromName: string; groupId: string }) {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(from, fromName);
        return next;
      });
    }

    function onGroupStopTyping({ from }: { from: string; groupId: string }) {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(from);
        return next;
      });
    }

    socket.on("receive_group_message", onReceiveGroupMessage);
    socket.on("group_message_sent", onGroupMessageSent);
    socket.on("group_message_error", onGroupMessageError);
    socket.on("group_typing", onGroupTyping);
    socket.on("group_stop_typing", onGroupStopTyping);

    return () => {
      socket.off("receive_group_message", onReceiveGroupMessage);
      socket.off("group_message_sent", onGroupMessageSent);
      socket.off("group_message_error", onGroupMessageError);
      socket.off("group_typing", onGroupTyping);
      socket.off("group_stop_typing", onGroupStopTyping);
    };
  }, [currentUserId, selectedGroup._id, dispatch]);

  // ── Send message ─────────────────────────────────────────────────────────────
  function sendMessage() {
    if (!newMessage.trim() || !currentUserId) return;

    const tempId = `temp_${Date.now()}`;

    const optimistic: GroupMessage = {
      _id: tempId,
      tempId,
      groupId: selectedGroup._id,
      senderId: currentUserId,
      senderName: currentUserName,
      text: newMessage.trim(),
      seenBy: [currentUserId],
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    dispatch(addGroupMessage(optimistic));
    setNewMessage("");

    socket.emit("send_group_message", {
      groupId: selectedGroup._id,
      senderId: currentUserId,
      senderName: currentUserName,
      text: optimistic.text,
      tempId,
    });
  }

  // ── Typing indicator ─────────────────────────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewMessage(e.target.value);
    if (!currentUserId) return;

    socket.emit("group_typing", {
      groupId: selectedGroup._id,
      from: currentUserId,
      fromName: currentUserName,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("group_stop_typing", {
        groupId: selectedGroup._id,
        from: currentUserId,
      });
    }, 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }

  const typingList = Array.from(typingUsers.values()).filter(Boolean);
  const typingText =
    typingList.length === 1
      ? `${typingList[0]} is typing...`
      : typingList.length > 1
      ? `${typingList.join(", ")} are typing...`
      : null;

  const memberCount = selectedGroup.members.length;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="sm:hidden text-gray-400 hover:text-slate-700 mr-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <Users className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">{selectedGroup.name}</p>
          <p className="text-xs text-gray-400">
            {typingText ? (
              <span className="text-indigo-400 italic">{typingText}</span>
            ) : (
              `${memberCount} member${memberCount !== 1 ? "s" : ""}`
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-slate-700">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-slate-700">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-slate-700">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {groupMessages.length > 0 ? (
          groupMessages.map((message) => {
            const isMe = message.senderId === currentUserId;
            const senderColor = getSenderColor(message.senderId);

            return (
              <div
                key={message._id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="mr-2 mt-auto">
                    <Avatar
                      initials={message.senderName?.charAt(0).toUpperCase() ?? "?"}
                      size="sm"
                      color={senderColor}
                    />
                  </div>
                )}

                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "text-white rounded-br-sm"
                      : "bg-white text-slate-800 rounded-bl-sm shadow-sm"
                  } ${message.status === "error" ? "opacity-50" : ""}`}
                  style={isMe ? { backgroundColor: BRAND_COLOR } : {}}
                >
                  {/* Show sender name in group messages for others */}
                  {!isMe && (
                    <p
                      className="text-[11px] font-semibold mb-1"
                      style={{ color: senderColor }}
                    >
                      {message.senderName}
                    </p>
                  )}

                  <p>{message.text}</p>

                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span
                      className={`text-[10px] ${
                        isMe ? "text-indigo-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-indigo-200">
                        {message.status === "sending"
                          ? "⏳"
                          : message.seenBy.length > 1
                          ? "✓✓"
                          : "✓"}
                      </span>
                    )}
                    {message.status === "error" && (
                      <span className="text-[10px] text-red-300 ml-1">Failed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center mt-20">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-100">
              <Send className="h-5 w-5" style={{ color: BRAND_COLOR }} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No messages yet</p>
            <p className="text-xs text-gray-400">Say hi to the group!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-slate-700 shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Message group..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-slate-50 pr-10 text-sm"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="button"
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="shrink-0 rounded-full w-9 h-9 p-0 flex items-center justify-center"
            style={{
              backgroundColor: BRAND_COLOR,
              opacity: !newMessage.trim() ? 0.6 : 1,
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}