import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import {
  Send,
  Paperclip,
  Smile,
  Search,
  MessageSquare,
  User,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { useSIP } from "../hooks/useSIP";

// Initialize socket
const socket = io(
  import.meta.env.VITE_BACKEND_URL || "http://172.20.47.19:5000",
  {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
  }
);

export default function Messaging() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const agentId = localStorage.getItem("username") || "Guest";
  const sipPassword = localStorage.getItem("sipPassword") || "1234";
  const asteriskIp = "172.20.47.25";
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize SIP for receiving messages
  useSIP(agentId, sipPassword, asteriskIp);

  // Connect socket with agentId
  useEffect(() => {
    if (agentId) {
      socket.io.opts.query = { agentId };
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, [agentId]);

  // Listen for SIP MESSAGE from Zoiper
  useEffect(() => {
    const handleSipMessage = async (event) => {
      const { from, message, timestamp } = event.detail;
      console.log("SIP MESSAGE received in chat:", from, message);

      // Save to database via API
      try {
        await api.post("/messages", {
          from,
          to: agentId,
          message,
          source: "sip",
        });
      } catch (err) {
        console.error("Failed to save SIP message:", err);
      }

      // Add to messages if it's from the selected conversation
      if (selectedConversation === from) {
        setMessages((prev) => [
          ...prev,
          { from, message, timestamp, _id: Date.now() },
        ]);
      }

      // Refresh conversations list
      setConversations((prev) => {
        const exists = prev.find((c) => c.partner === from);
        if (!exists) {
          return [...prev, { partner: from, lastMessage: message }];
        }
        return prev.map((c) =>
          c.partner === from ? { ...c, lastMessage: message } : c
        );
      });
    };

    window.addEventListener("sipMessage", handleSipMessage);
    return () => window.removeEventListener("sipMessage", handleSipMessage);
  }, [selectedConversation]);

  // Check for agent param from dashboard
  useEffect(() => {
    const targetAgent = searchParams.get("agent");
    if (targetAgent) {
      setSelectedConversation(targetAgent);
    }
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations list
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get(`/messages/conversations/${agentId}`);
        setConversations(res.data || []);
      } catch (err) {
        console.error("Failed to fetch conversations", err);
      }
    };
    fetchConversations();
  }, [agentId, messages]); // Refresh when messages change

  // Load messages for selected conversation
  useEffect(() => {
    if (!agentId || !selectedConversation) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(
          `/messages/${agentId}/${selectedConversation}`
        );
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();

    // Listen for incoming messages
    const handleReceiveMessage = (msg) => {
      if (
        msg.from === selectedConversation ||
        msg.to === selectedConversation
      ) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    socket.on("typing", ({ from }) => {
      if (from === selectedConversation) setIsTyping(true);
    });

    socket.on("stopTyping", () => setIsTyping(false));

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, [agentId, selectedConversation]);

  const handleSend = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !selectedConversation) return;

    const messageData = {
      from: agentId,
      to: selectedConversation,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    // setMessages((prev) => [...prev, messageData]); // Wait for server ack instead to avoid dupes if we want strict consistency, but optimistic is better UX.
    // Actually, server sends back "receiveMessage" to sender too, so we can just wait for that or handle deduping.
    // Let's rely on server response for now to ensure persistence is confirmed.

    socket.emit("sendMessage", {
      to: selectedConversation,
      message: trimmedMessage,
    });
    setNewMessage("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Copy message to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setActiveMenu(null);
  };

  // Start editing a message
  const handleStartEdit = (msg) => {
    setEditingMessage(msg._id);
    setEditText(msg.message);
    setActiveMenu(null);
  };

  // Save edited message
  const handleSaveEdit = async (msgId) => {
    try {
      await api.put(`/messages/${msgId}`, { message: editText });
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, message: editText } : m))
      );
      setEditingMessage(null);
      setEditText("");
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  // Delete a message
  const handleDelete = async (msgId) => {
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      setActiveMenu(null);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-dark-900">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-dark-800 border-r border-white/10 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-700 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-dark-700 transition-all border-b border-white/5 ${
                  selectedConversation === conv.id
                    ? "bg-dark-700 border-l-2 border-l-accent-purple"
                    : ""
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {conv.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate">
                      {conv.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(conv.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {conv.unread}
                    </span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-dark-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {selectedConversation[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-white">
                    {selectedConversation}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent-green rounded-full" />
                    <span className="text-sm text-gray-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSender = msg.from === agentId;
                  const isEditing = editingMessage === msg._id;

                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex group ${
                        isSender ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="relative">
                        {/* Message bubble */}
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl ${
                            isSender
                              ? "bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-br-none"
                              : "bg-dark-700 text-gray-100 rounded-bl-none"
                          }`}
                        >
                          {!isSender && (
                            <p className="text-xs font-medium text-accent-purple mb-1">
                              {msg.from}
                            </p>
                          )}

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-white/20 text-white rounded px-2 py-1 text-sm w-full"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(msg._id)}
                                className="text-green-400 hover:text-green-300"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingMessage(null)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm break-words">{msg.message}</p>
                          )}

                          <span
                            className={`block text-xs mt-1 ${
                              isSender ? "text-white/70" : "text-gray-500"
                            }`}
                          >
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>

                        {/* Action menu button */}
                        {!isEditing && (
                          <button
                            onClick={() =>
                              setActiveMenu(
                                activeMenu === msg._id ? null : msg._id
                              )
                            }
                            className={`absolute top-1 ${
                              isSender ? "-left-6" : "-right-6"
                            } opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white`}
                          >
                            <MoreVertical size={14} />
                          </button>
                        )}

                        {/* Dropdown menu */}
                        {activeMenu === msg._id && (
                          <div
                            className={`absolute top-6 ${
                              isSender ? "-left-24" : "-right-24"
                            } bg-dark-700 border border-white/10 rounded-lg shadow-xl z-10 py-1 min-w-[100px]`}
                          >
                            <button
                              onClick={() => handleCopy(msg.message)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-600 flex items-center gap-2"
                            >
                              <Copy size={14} /> Copy
                            </button>
                            {isSender && (
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-600 flex items-center gap-2"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(msg._id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-dark-600 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-dark-700 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-dark-800 border-t border-white/10 p-4">
              <div className="flex items-end gap-3">
                <button className="text-gray-500 hover:text-gray-300 mb-2">
                  <Paperclip size={20} />
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="flex-1 resize-none bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple transition-all"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => socket.emit("typing", { from: agentId })}
                  onBlur={() => socket.emit("stopTyping")}
                />

                <div className="flex items-center gap-2 mb-2">
                  <button className="text-gray-500 hover:text-gray-300">
                    <Smile size={20} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className={`p-3 rounded-full transition-all ${
                      newMessage.trim()
                        ? "bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-lg"
                        : "bg-dark-600 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Select a Conversation
              </h3>
              <p className="text-gray-400">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
