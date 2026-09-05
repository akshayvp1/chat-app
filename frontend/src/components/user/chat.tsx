// Chat.tsx
// ─── CHANGED from previous version ──────────────────────────────────────────
// 1. Sidebar now has two tabs: "Direct" and "Groups"
// 2. Groups tab shows list of groups + a "New Group" button
// 3. When a group is selected, renders <GroupChat /> instead of DM chat area
// 4. Loads groups from server on mount
// 5. Everything else (DM flow, socket, typing) unchanged
// ─────────────────────────────────────────────────────────────────────────────

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
  Users,
  Plus,
  MessageSquare,
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
import {
  setGroups,
  setSelectedGroup,
  clearGroupChat,
} from "../../redux/slices/groupSlice";
import type { ChatMessage, UserList } from "../../types/types";
import chatService from "@/services/user/chatService";
import groupService from "@/services/user/groupService";
import { socket } from "@/socket/socket";
import GroupChat from "./GroupChat";
import CreateGroupModal from "./CreateGroupModal";

const BRAND_COLOR = "#5b7cfa";

type Tab = "direct" | "groups";

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

  const currentUserId = useAppSelector((s) => s.auth.user?._id ?? "");
  const messages = useAppSelector((s) => s.chat.messages);
  const contacts = useAppSelector((s) => s.chat.contacts);
  const selectedContact = useAppSelector((s) => s.chat.selectedContact);
  const groups = useAppSelector((s) => s.group.groups);
  const selectedGroup = useAppSelector((s) => s.group.selectedGroup);

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("direct");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContactRef = useRef<UserList | null>(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetch contacts ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (contacts.length > 0) return;
    async function fetchUsers() {
      const result = await chatService.getUsers();
      if (result.success && result.data) dispatch(setContacts(result.data));
    }
    fetchUsers();
  }, [dispatch, contacts.length]);

  // ── Fetch groups ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchGroups() {
      const result = await groupService.getMyGroups();
      if (result.success && result.data) dispatch(setGroups(result.data));
    }
    fetchGroups();
  }, [dispatch]);

  // ── Fetch DM messages when contact changes ───────────────────────────────────
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
          socket.emit("mark_seen", { messageIds: unreadIds, senderId: selectedContact._id });
        }
      }
    }
    fetchMessages();
  }, [selectedContact?._id, dispatch]);

  // ── Socket lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    socket.io.opts.query = { userId: currentUserId };
    if (!socket.connected) socket.connect();

    function onMessageSent(payload: ChatMessage) {
      dispatch(replaceMessage({ ...payload, status: "sent" }));
    }
    function onReceiveMessage(payload: ChatMessage) {
      dispatch(addMessage({ ...payload, status: "sent" }));
      const contact = selectedContactRef.current;
      if (contact && payload.senderId === contact._id) {
        socket.emit("mark_seen", { messageIds: [payload._id], senderId: payload.senderId });
      }
    }
    function onMessagesSeen({ messageIds }: { messageIds: string[] }) {
      dispatch(markMessagesSeen(messageIds));
    }
    function onUserStatus({ userId, online }: { userId: string; online: boolean }) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        online ? next.add(userId) : next.delete(userId);
        return next;
      });
    }
    function onTyping({ from }: { from: string }) {
      if (selectedContactRef.current?._id === from) setIsTyping(true);
    }
    function onStopTyping({ from }: { from: string }) {
      if (selectedContactRef.current?._id === from) setIsTyping(false);
    }
    function onMessageError({ tempId }: { tempId: string }) {
      dispatch(markMessageError(tempId));
    }

    socket.on("message_sent", onMessageSent);
    socket.on("receive_message", onReceiveMessage);
    socket.on("messages_seen", onMessagesSeen);
    socket.on("user_status", onUserStatus);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("message_error", onMessageError);

    return () => {
      socket.off("message_sent", onMessageSent);
      socket.off("receive_message", onReceiveMessage);
      socket.off("messages_seen", onMessagesSeen);
      socket.off("user_status", onUserStatus);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("message_error", onMessageError);
    };
  }, [currentUserId, dispatch]);

  // ── Select DM contact ────────────────────────────────────────────────────────
  function selectContact(user: UserList) {
    dispatch(setSelectedContact(user));
    dispatch(setSelectedGroup(null));
    setShowSidebar(false);
    setIsTyping(false);
  }

  // ── Select group ─────────────────────────────────────────────────────────────
  function selectGroup(group: Parameters<typeof setSelectedGroup>[0]) {
    dispatch(setSelectedGroup(group));
    dispatch(setSelectedContact(null));
    setShowSidebar(false);
  }

  // ── Send DM ──────────────────────────────────────────────────────────────────
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
      senderId: currentUserId,
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
      socket.emit("stop_typing", { to: selectedContact._id, from: currentUserId });
    }, 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
  }

  async function handleLogout() {
    socket.disconnect();
    dispatch(clearChat());
    dispatch(clearGroupChat());
    await chatService.logout();
  }

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const nothingSelected = !selectedContact && !selectedGroup;

  return (
    <div className="flex h-screen bg-indigo-50 font-sans overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } sm:flex flex-col w-full sm:w-80 bg-white border-r border-slate-100 shrink-0`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <p className="text-lg font-extrabold text-slate-900">Messages</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-slate-700">
              <LogOut className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-slate-700">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 mb-1">
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "direct"
                ? "text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            style={activeTab === "direct" ? { backgroundColor: BRAND_COLOR } : {}}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Direct
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "groups"
                ? "text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            style={activeTab === "groups" ? { backgroundColor: BRAND_COLOR } : {}}
          >
            <Users className="h-3.5 w-3.5" />
            Groups
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Direct messages tab ────────────────────────────────────────── */}
          {activeTab === "direct" && (
            <>
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
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 mt-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-100">
                    <Search className="h-5 w-5" style={{ color: BRAND_COLOR }} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No contacts found</p>
                </div>
              )}
            </>
          )}

          {/* ── Groups tab ─────────────────────────────────────────────────── */}
          {activeTab === "groups" && (
            <>
              {/* New group button */}
              <div className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-semibold text-slate-500 hover:text-indigo-600"
                >
                  <Plus className="h-4 w-4" />
                  New Group
                </button>
              </div>

              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() => selectGroup(group)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left ${
                      selectedGroup?._id === group._id ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${BRAND_COLOR}20` }}
                    >
                      <Users className="h-5 w-5" style={{ color: BRAND_COLOR }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                      <p className="text-xs text-gray-500">
                        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 mt-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-100">
                    <Users className="h-5 w-5" style={{ color: BRAND_COLOR }} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No groups yet</p>
                  <p className="text-xs text-gray-400">Create one to get started.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className={`${!showSidebar ? "flex" : "hidden"} sm:flex flex-1 flex-col min-w-0`}>

        {/* Group chat */}
        {selectedGroup && (
          <GroupChat
            selectedGroup={selectedGroup}
            onBack={() => setShowSidebar(true)}
          />
        )}

        {/* DM chat */}
        {selectedContact && !selectedGroup && (
          <>
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
                <p className="text-sm font-bold text-slate-900">{selectedContact.name}</p>
                <p className="text-xs text-gray-400">
                  {isTyping ? (
                    <span className="text-indigo-400 italic">typing...</span>
                  ) : onlineUsers.has(selectedContact._id) ? "Online" : "Offline"}
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

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const isMe = message.senderId === currentUserId;
                  return (
                    <div key={message._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <div className="mr-2 mt-auto">
                          <Avatar initials={selectedContact.name.charAt(0).toUpperCase()} size="sm" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe ? "text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm shadow-sm"
                        } ${message.status === "error" ? "opacity-50" : ""}`}
                        style={isMe ? { backgroundColor: BRAND_COLOR } : {}}
                      >
                        <p>{message.text}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[10px] ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-indigo-200">
                              {message.status === "sending" ? "⏳" : message.seen ? "✓✓" : "✓"}
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
                  <p className="text-xs text-gray-400">Say hi to start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-slate-700 shrink-0">
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
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600">
                    <Smile className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="shrink-0 rounded-full w-9 h-9 p-0 flex items-center justify-center"
                  style={{ backgroundColor: BRAND_COLOR, opacity: !newMessage.trim() ? 0.6 : 1 }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Nothing selected */}
        {nothingSelected && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-100">
              <Send className="h-7 w-7" style={{ color: BRAND_COLOR }} />
            </div>
            <p className="text-lg font-extrabold text-slate-900">Your Messages</p>
            <p className="text-sm text-gray-500">Select a conversation or group to start chatting.</p>
          </div>
        )}
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={() => {
            groupService.getMyGroups().then((res) => {
              if (res.success && res.data) dispatch(setGroups(res.data));
            });
          }}
        />
      )}
    </div>
  );
}