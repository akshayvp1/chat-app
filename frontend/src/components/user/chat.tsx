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
import type { Contact, Message } from "../../types/types";
import { UserList } from "../../types/types";
import chatService from "@/services/user/chatService";
import { useNavigate } from "react-router-dom";

const BRAND_COLOR = "#5b7cfa";

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
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-green-400" : "bg-gray-300"}`}
        />
      )}
    </div>
  );
}

export default function Chat() {
  const [selectedContact, setSelectedContact] = useState<UserList | null>(null);

  const [contacts, setContacts] = useState<UserList[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectContact(user: UserList) {
    setSelectedContact(user);
    setShowSidebar(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const result = await chatService.getUsers();

      if (result.success && result.data) {
        setContacts(result.data);
      }
    } catch (error) {
      console.log(error);
    }
  }

  function sendMessage() {
    if (!newMessage.trim() || !selectedContact) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      seen: false,
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
    // TODO: send message to API
    // await chatService.sendMessage({ contactId: selectedContact.id, text: message.text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage();
  }

  async function handleLogout() {
    try {
      await chatService.logout();
      navigate("/chat");
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="flex h-screen bg-indigo-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } sm:flex flex-col w-full sm:w-80 bg-white border-r border-slate-100 shrink-0`}
      >
        {/* Sidebar header */}
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

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="pl-9 bg-slate-50 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((user) => (
              <button
                key={user._id}
                type="button"
                onClick={() => selectContact(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left"
              >
                <Avatar
                  initials={user.name.substring(0, 2).toUpperCase()}
                  online={true}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {user.name}
                  </p>

                  <p className="text-xs text-gray-500">{user.email}</p>
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
        className={`${!showSidebar ? "flex" : "hidden"} sm:flex flex-1 flex-col min-w-0`}
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
                online={true}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {selectedContact.name}
                </p>
                <p className="text-xs text-gray-400">{selectedContact.email}</p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-slate-700"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-slate-700"
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-slate-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    {message.sender === "other" && (
                      <div className="mr-2 mt-auto">
                        <Avatar
                          initials={selectedContact.name
                            .charAt(0)
                            .toUpperCase()}
                          size="sm"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        message.sender === "me"
                          ? "text-white rounded-br-sm"
                          : "bg-white text-slate-800 rounded-bl-sm shadow-sm"
                      }`}
                      style={
                        message.sender === "me"
                          ? { backgroundColor: BRAND_COLOR }
                          : {}
                      }
                    >
                      <p>{message.text}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          message.sender === "me"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <span
                          className={`text-[10px] ${
                            message.sender === "me"
                              ? "text-indigo-200"
                              : "text-gray-400"
                          }`}
                        >
                          {message.time}
                        </span>
                        {message.sender === "me" && (
                          <span className="text-[10px] text-indigo-200">
                            {message.seen ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
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

            {/* Message input */}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMessage(e.target.value)
                    }
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
