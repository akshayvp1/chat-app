import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector, useAppDispatch } from "../../redux/hooks";
import {
  setContacts,
  setSelectedContact,
  setMessages,
  addMessage,
  replaceMessage,
  markMessageError,
  markMessagesSeen,
  clearChat,
} from "../../redux/slices/chatSlice";
import type { ChatMessage, UserList } from "../../types/types";
import chatService from "@/services/user/chatService";
import { socket } from "@/socket/socket";

const BRAND_COLOR = "#5b7cfa";

function formatLastSeen(lastSeen?: string | null): string {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  return `Last seen ${date.toLocaleDateString()}`;
}

function Avatar({
  initials,
  online,
  size = "md",
}: {
  initials: string;
  online?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div className="relative shrink-0">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: BRAND_COLOR }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            online ? "bg-green-400" : "bg-gray-300"
          }`}
        />
      )}
    </div>
  );
}

export default function Chat() {
  const dispatch = useAppDispatch();

  // ── FIX 1: read _id reliably from auth state ──────────────────────────────
  const currentUserId = useAppSelector((state) => {
    const user = state.auth.user;
    if (!user) return "";
    return "_id" in user ? (user._id as string) : "";
  });

  const messages = useAppSelector((state) => state.chat.messages);
  const contacts = useAppSelector((state) => state.chat.contacts);
  const selectedContact = useAppSelector((state) => state.chat.selectedContact);

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string | null>>({});
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContactRef = useRef<UserList | null>(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetch contacts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (contacts.length > 0) {
      // re-seed lastSeenMap from already-loaded contacts
      const map: Record<string, string | null> = {};
      contacts.forEach((u) => {
        map[u._id] = u.lastSeen ?? null;
      });
      setLastSeenMap(map);
      return;
    }
    async function fetchUsers() {
      const result = await chatService.getUsers();
      if (result.success && result.data) {
        dispatch(setContacts(result.data));
        const map: Record<string, string | null> = {};
        result.data.forEach((u: UserList) => {
          map[u._id] = u.lastSeen ?? null;
        });
        setLastSeenMap(map);
      }
    }
    fetchUsers();
  }, [dispatch, contacts]);

  // ── Fetch messages when selected contact changes ──────────────────────────
  useEffect(() => {
    if (!selectedContact) return;

    async function fetchMessages() {
      if (!selectedContact) return;
      const res = await chatService.getMessages(selectedContact._id);
      if (res.success && res.data) {
        const loaded: ChatMessage[] = res.data.map((m) => ({
          ...m,
          status: "sent" as const,
        }));
        dispatch(setMessages(loaded));

        const unreadIds = loaded
          .filter((m) => m.senderId === selectedContact._id && !m.seen)
          .map((m) => m._id);

        if (unreadIds.length > 0) {
          socket.emit("mark_seen", {
            messageIds: unreadIds,
            senderId: selectedContact._id,
          });
        }
      }
    }

    fetchMessages();
  }, [selectedContact?._id, dispatch]);

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    socket.io.opts.query = { userId: currentUserId };

    // ── FIX 2: request online users after connect ─────────────────────────
    if (!socket.connected) {
      socket.connect();
      socket.once("connect", () => {
        socket.emit("get_online_users");
      });
    } else {
      socket.emit("get_online_users");
    }

    // ── FIX 3: seed onlineUsers from server response ──────────────────────
    function onOnlineUsers(userIds: string[]) {
      setOnlineUsers(new Set(userIds));
    }

    function onMessageSent(payload: ChatMessage) {
      dispatch(replaceMessage({ ...payload, status: "sent" }));
    }

    function onReceiveMessage(payload: ChatMessage) {
      dispatch(addMessage({ ...payload, status: "sent" }));
      const contact = selectedContactRef.current;
      if (contact && payload.senderId === contact._id) {
        socket.emit("mark_seen", {
          messageIds: [payload._id],
          senderId: payload.senderId,
        });
      }
    }

    function onMessagesSeen({ messageIds }: { messageIds: string[] }) {
      dispatch(markMessagesSeen(messageIds));
    }

    // ── FIX 4: update lastSeenMap when user goes offline ──────────────────
    function onUserStatus({
      userId,
      online,
      lastSeen,
    }: {
      userId: string;
      online: boolean;
      lastSeen?: string | null;
    }) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        online ? next.add(userId) : next.delete(userId);
        return next;
      });
      if (!online && lastSeen) {
        setLastSeenMap((prev) => ({
          ...prev,
          [userId]: typeof lastSeen === "string"
            ? lastSeen
            : new Date(lastSeen).toISOString(),
        }));
      }
    }

    // ── FIX 5: typing only triggers for current contact ───────────────────
    function onTyping({ from }: { from: string }) {
      if (selectedContactRef.current?._id === from) {
        setIsTyping(true);
      }
    }

    function onStopTyping({ from }: { from: string }) {
      if (selectedContactRef.current?._id === from) {
        setIsTyping(false);
      }
    }

    function onMessageError({ tempId }: { tempId: string }) {
      dispatch(markMessageError(tempId));
    }

    socket.on("online_users", onOnlineUsers);
    socket.on("message_sent", onMessageSent);
    socket.on("receive_message", onReceiveMessage);
    socket.on("messages_seen", onMessagesSeen);
    socket.on("user_status", onUserStatus);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("message_error", onMessageError);

    return () => {
      socket.off("online_users", onOnlineUsers);
      socket.off("message_sent", onMessageSent);
      socket.off("receive_message", onReceiveMessage);
      socket.off("messages_seen", onMessagesSeen);
      socket.off("user_status", onUserStatus);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("message_error", onMessageError);
    };
  }, [currentUserId, dispatch]);

  // ── Reset typing when contact changes ────────────────────────────────────
  useEffect(() => {
    setIsTyping(false);
  }, [selectedContact?._id]);

  function selectContact(user: UserList) {
    dispatch(setSelectedContact(user));
    setShowSidebar(false);
  }

  function sendMessage() {
    if (!newMessage.trim() || !selectedContact || !currentUserId) return;

    const tempId = `temp_${Date.now()}`;

    const optimistic: ChatMessage = {
      _id: tempId,
      tempId,
      senderId: currentUserId,
      receiverId: selectedContact._id,
      text: newMessage.trim(),
      seen: false,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    dispatch(addMessage(optimistic));
    setNewMessage("");

    socket.emit("send_message", {
      receiverId: selectedContact._id,
      text: optimistic.text,
      tempId,
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewMessage(e.target.value);
    if (!selectedContact || !currentUserId) return;

    socket.emit("typing", { to: selectedContact._id, from: currentUserId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        to: selectedContact._id,
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

  async function handleLogout() {
    socket.disconnect();
    dispatch(clearChat());
    await chatService.logout();
  }

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function getStatusLine(): React.ReactNode {
    if (!selectedContact) return null;
    if (isTyping) {
      return <span className="text-indigo-400 italic">typing...</span>;
    }
    if (onlineUsers.has(selectedContact._id)) {
      return <span className="text-green-500 font-medium">Online</span>;
    }
    return (
      <span className="text-gray-400">
        {formatLastSeen(lastSeenMap[selectedContact._id])}
      </span>
    );
  }

  return (
    <div className="flex h-screen bg-indigo-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } sm:flex flex-col w-full sm:w-80 bg-white border-r border-slate-100 shrink-0`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <p className="text-lg font-extrabold text-slate-900">Messages</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-slate-700"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-slate-700"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((user) => (
              <button
                key={user._id}
                type="button"
                onClick={() => selectContact(user)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left ${
                  selectedContact?._id === user._id ? "bg-indigo-50" : ""
                }`}
              >
                <Avatar
                  initials={user.name.substring(0, 2).toUpperCase()}
                  online={onlineUsers.has(user._id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {onlineUsers.has(user._id)
                      ? "Online"
                      : formatLastSeen(lastSeenMap[user._id])}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 mt-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-100">
                <Search className="h-5 w-5" style={{ color: BRAND_COLOR }} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                No contacts found
              </p>
              <p className="text-xs text-gray-400">
                Try searching with a different name.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`${
          !showSidebar ? "flex" : "hidden"
        } sm:flex flex-1 flex-col min-w-0`}
      >
        {selectedContact ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className="sm:hidden text-gray-400 hover:text-slate-700 mr-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <Avatar
                initials={selectedContact.name.substring(0, 2).toUpperCase()}
                online={onlineUsers.has(selectedContact._id)}
                size="md"
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {selectedContact.name}
                </p>
                <p className="text-xs">{getStatusLine()}</p>
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
              {messages.length > 0 ? (
                messages.map((message) => {
                  // ── FIX 6: reliable isMe check ────────────────────────
                  const isMe = message.senderId === currentUserId;
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {!isMe && (
                        <div className="mr-2 mt-auto">
                          <Avatar
                            initials={selectedContact.name.charAt(0).toUpperCase()}
                            size="sm"
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
                                : message.seen
                                ? "✓✓"
                                : "✓"}
                            </span>
                          )}
                          {message.status === "error" && (
                            <span className="text-[10px] text-red-300 ml-1">
                              Failed
                            </span>
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
                  <p className="text-sm font-semibold text-slate-700">
                    No messages yet
                  </p>
                  <p className="text-xs text-gray-400">
                    Say hi to start the conversation!
                  </p>
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
                    placeholder="Type a message..."
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
                  onClick={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-100">
              <Send className="h-7 w-7" style={{ color: BRAND_COLOR }} />
            </div>
            <p className="text-lg font-extrabold text-slate-900">
              Your Messages
            </p>
            <p className="text-sm text-gray-500">
              Select a conversation to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}