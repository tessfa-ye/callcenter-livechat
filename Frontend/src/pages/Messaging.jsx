import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import api from "../services/api";
import { Send, Paperclip, Smile } from "lucide-react"; // Optional: lucide-react icons

// Initialize socket outside component to prevent reconnecting on every render
const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
});

export default function Messaging() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const agentId = localStorage.getItem("username") || "Guest";
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history & setup socket
  useEffect(() => {
    if (!agentId) return;

    // Fetch previous messages
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${agentId}`);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };

    fetchMessages();

    // Join agent room
    socket.emit("join", { agentId });

    // Listen for new messages
    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Optional: typing indicators
    socket.on("typing", ({ from }) => {
      if (from !== agentId) setIsTyping(true);
    });

    socket.on("stopTyping", () => setIsTyping(false));

    // Cleanup
    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
      socket.off("stopTyping");
      socket.emit("leave", { agentId });
    };
  }, [agentId]);

  const handleSend = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;

    const messageData = {
      from: agentId,
      to: "1002", // Make dynamic in real app
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    };

    socket.emit("sendMessage", messageData);
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">{agentId[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Agent Chat</h1>
              <p className="text-sm opacity-90">Agent ID: {agentId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Online</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-chat-pattern bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.from === agentId ? "justify-end" : "justify-start"} animate-fadeIn`}
            >
              <div
                className={`relative max-w-sm md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm ${
                  msg.from === agentId
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.from !== agentId && (
                  <p className="text-xs font-medium text-blue-600 mb-1">
                    Agent {msg.from}
                  </p>
                )}
                <p className="text-sm md:text-base break-words">{msg.message}</p>
                <span
                  className={`block text-xs mt-1 ${
                    msg.from === agentId ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex space-x-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <button className="text-gray-500 hover:text-gray-700 mb-2">
            <Paperclip size={22} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => socket.emit("typing", { from: agentId })}
            onBlur={() => socket.emit("stopTyping")}
          />

          <div className="flex items-center gap-2 mb-2">
            <button className="text-gray-500 hover:text-gray-700">
              <Smile size={22} />
            </button>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={`p-3 rounded-full transition-all ${
                newMessage.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}