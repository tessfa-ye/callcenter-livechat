import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../services/api";
import { Send, Paperclip, Smile, Search, MessageSquare, User } from "lucide-react";

// Initialize socket
const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
});

export default function Messaging() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const agentId = localStorage.getItem("username") || "Guest";
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
        const res = await api.get(`/messages/${agentId}/${selectedConversation}`);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();
    
    // Listen for incoming messages
    const handleReceiveMessage = (msg) => {
      if (msg.from === selectedConversation || msg.to === selectedConversation) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m._id === msg._id)) return prev;
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
    
    socket.emit("sendMessage", { to: selectedConversation, message: trimmedMessage });
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
                  selectedConversation === conv.id ? "bg-dark-700 border-l-2 border-l-accent-purple" : ""
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {conv.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate">{conv.name}</span>
                    <span className="text-xs text-gray-500">{formatTime(conv.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{conv.unread}</span>
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
                  <h2 className="font-semibold text-white">{selectedConversation}</h2>
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
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.from === agentId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl ${
                        msg.from === agentId
                          ? "bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-br-none"
                          : "bg-dark-700 text-gray-100 rounded-bl-none"
                      }`}
                    >
                      {msg.from !== agentId && (
                        <p className="text-xs font-medium text-accent-purple mb-1">
                          {msg.from}
                        </p>
                      )}
                      <p className="text-sm break-words">{msg.message}</p>
                      <span className={`block text-xs mt-1 ${msg.from === agentId ? "text-white/70" : "text-gray-500"}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-dark-700 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
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
              <h3 className="text-xl font-semibold text-white mb-2">Select a Conversation</h3>
              <p className="text-gray-400">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}