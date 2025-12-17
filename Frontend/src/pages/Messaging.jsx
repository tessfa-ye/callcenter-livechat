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
const socket = io("/", {
    path: "/socket.io",
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    transports: ["websocket"] // Force WebSocket
});

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
  const [notifications, setNotifications] = useState([]);
  const [customAlert, setCustomAlert] = useState(null);
  const agentId = localStorage.getItem("username") || "Guest";
  const sipPassword = localStorage.getItem("sipPassword") || "1234";
  const asteriskIp = "172.20.47.25";
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize SIP for receiving messages
  useSIP(agentId, sipPassword, asteriskIp);

  // Notification functions
  const playNotificationSound = () => {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  };

  const showNotification = (from, message) => {
    const notification = {
      id: Date.now(),
      from,
      message: message.length > 50 ? message.substring(0, 50) + "..." : message,
      timestamp: new Date(),
    };
    
    
    setNotifications(prev => [notification, ...prev]);
    
    // Play notification sound
    playNotificationSound();
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);

    // Browser notification if permission granted
    if (Notification.permission === "granted") {
      new Notification(`New message from ${from}`, {
        body: message,
        icon: "/favicon.ico",
      });
    }
  };

  // Connect socket with agentId and request notification permission
  useEffect(() => {
    if (agentId) {
      socket.io.opts.query = { agentId };
      socket.connect();
    }

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [agentId]);

  // Listen for SIP MESSAGE from Zoiper
  useEffect(() => {
    const handleSipMessage = async (event) => {
      const { from, message } = event.detail;
      console.log("SIP MESSAGE received from", from + ":", message);

      // DUPLICATE FIX: Server AMI already captures 'MessageEntry' and saves to DB.
      // We do NOT need to save it again here.
      /*
      try {
        await api.post("/messages", {
          from,
          to: agentId,
          message,
          source: "sip",
        });
        console.log("SIP message saved to database");
      } catch (err) {
        console.error("Failed to save SIP message:", err);
      }
      */

      // Don't add to UI directly - socket will handle this to prevent duplicates
    };

    window.addEventListener("sipMessage", handleSipMessage);
    return () => window.removeEventListener("sipMessage", handleSipMessage);
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
        const conversations = res.data || [];
        
        // Remove duplicates from initial load
        const uniqueConversations = [];
        const seenIds = new Set();
        
        conversations.forEach(conv => {
          const id = conv.id || conv.partner || conv.name;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueConversations.push(conv);
          }
        });
        
        console.log("Initial conversations loaded:", uniqueConversations);
        setConversations(uniqueConversations);
      } catch (err) {
        console.error("Failed to fetch conversations", err);
      }
    };
    fetchConversations();
  }, [agentId, messages]); // Refresh when messages change

  // Load messages for selected conversation
  useEffect(() => {
    if (!agentId || !selectedConversation) return;

    // Clear messages when switching conversations
    setMessages([]);
    
    // Don't automatically clear unread count when loading messages
    // Only clear when user explicitly clicks the conversation

    const fetchMessages = async () => {
      try {
        console.log("Fetching messages for conversation:", selectedConversation);
        const res = await api.get(
          `/messages/${agentId}/${selectedConversation}`
        );
        console.log("Fetched messages:", res.data);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();

    // Listen for incoming messages
    const handleReceiveMessage = (msg) => {
      // Check if message is for current conversation
      const isCurrentConversation = (
        msg.from === selectedConversation ||
        msg.to === selectedConversation
      );

      // Check if message is incoming (not from current user)
      const isIncomingMessage = msg.from !== agentId;

      if (isCurrentConversation) {
        console.log("📨 Received message data:", msg);
        setMessages((prev) => {
          // Check if we have a temporary message that matches this incoming one
          const tempMessageIndex = prev.findIndex((m) => {
            if (!m._id.toString().startsWith('temp-')) return false;
            
             // Check by content, sender, and timestamp (relaxed window)
            return (
              m.from === msg.from && 
              m.to === msg.to && 
              m.message === msg.message
            );
          });
          
          if (tempMessageIndex !== -1) {
            console.log("♻️ Replacing temp message with confirmed message");
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = msg; // Replace temp with real
            return newMessages;
          }

          // Check if we already have this exact real message (by ID)
          const isDuplicate = prev.some(m => m._id === msg._id);
          if (isDuplicate) {
             console.log("🚫 Duplicate message detected (ID match), skipping");
             return prev;
          }
          
          console.log("✅ Adding new message to conversation");
          return [...prev, msg];
        });

        // Auto-mark as read if this is an incoming message in the current conversation
        if (isIncomingMessage) {
          // Mark this message as read immediately since user is viewing it
          api.put(`/messages/mark-read/${agentId}/${selectedConversation}`)
            .catch(err => console.error("Failed to auto-mark message as read:", err));
        }
      } else if (isIncomingMessage) {
        // Message from different conversation - show notification
        showNotification(msg.from, msg.message);
      }

      // Update conversations list with latest message
      setConversations(prev => {
        const partnerId = msg.from === agentId ? msg.to : msg.from;
        
        console.log("Updating conversation for partner:", partnerId);
        console.log("Current conversations:", prev.map(c => ({ id: c.id, partner: c.partner, name: c.name })));
        
        // Find existing conversation by id, partner, or name
        const existingIndex = prev.findIndex(c => 
          c.id === partnerId || 
          c.partner === partnerId || 
          c.name === partnerId
        );
        
        console.log("Found existing conversation at index:", existingIndex);
        
        let updated = [...prev];
        
        if (existingIndex >= 0) {
          // Remove existing conversation from its current position
          const existingConv = updated[existingIndex];
          updated.splice(existingIndex, 1);
          
          // Update conversation data
          const conversationData = {
            ...existingConv,
            lastMessage: msg.message,
            timestamp: msg.timestamp,
            // Set unread to 0 if this is the current conversation, otherwise increment for incoming messages
            unread: isCurrentConversation 
              ? 0 
              : (isIncomingMessage ? (existingConv.unread || 0) + 1 : (existingConv.unread || 0))
          };
          
          // Add updated conversation to the top
          updated.unshift(conversationData);
        } else {
          // New conversation - add at the top
          const conversationData = {
            id: partnerId,
            partner: partnerId,
            name: partnerId,
            lastMessage: msg.message,
            timestamp: msg.timestamp,
            unread: isIncomingMessage && !isCurrentConversation ? 1 : 0
          };
          
          updated.unshift(conversationData);
        }
        
        // Remove any duplicates that might exist
        const uniqueConversations = [];
        const seenIds = new Set();
        
        updated.forEach(conv => {
          const id = conv.id || conv.partner || conv.name;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueConversations.push(conv);
          }
        });
        
        console.log("Final conversations after dedup:", uniqueConversations.map(c => ({ id: c.id, partner: c.partner, name: c.name })));
        return uniqueConversations;
      });
    };

    socket.on("receiveMessage", handleReceiveMessage);

    socket.on("typing", ({ from }) => {
      if (from === selectedConversation) setIsTyping(true);
    });

    socket.on("stopTyping", () => setIsTyping(false));

    socket.on("messages:read", ({ partnerId }) => {
      console.log("Marking messages as read for:", partnerId);
      setConversations(prev => 
        prev.map(c => 
          (c.id === partnerId || c.partner === partnerId || c.name === partnerId)
            ? { ...c, unread: 0 }
            : c
        )
      );
    });

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("messages:read");
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

    // Optimistic update - add message immediately for sender
    setMessages((prev) => [...prev, { ...messageData, _id: `temp-${Date.now()}` }]);

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
      // Check if it's a temporary message (starts with temp-)
      if (msgId.toString().startsWith('temp-')) {
        console.log("Deleting temporary message from UI only");
        setMessages((prev) => prev.filter((m) => m._id !== msgId));
        setActiveMenu(null);
        return;
      }

      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      setActiveMenu(null);
    } catch (err) {
      console.error("Failed to delete message:", err);
      
      // If 404, message doesn't exist in DB, just remove from UI
      if (err.response?.status === 404) {
        console.log("Message not found in database, removing from UI");
        setMessages((prev) => prev.filter((m) => m._id !== msgId));
        setActiveMenu(null);
      } else {
        showCustomAlert("Failed to delete message. Please try again.", 'error');
      }
    }
  };

  // Multiple delete functionality
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const toggleMessageSelection = (msgId) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) {
        newSet.delete(msgId);
      } else {
        newSet.add(msgId);
      }
      return newSet;
    });
  };

  const handleMultipleDelete = async () => {
    if (selectedMessages.size === 0) return;

    showCustomAlert(
      `Delete ${selectedMessages.size} selected message${selectedMessages.size > 1 ? 's' : ''}?`,
      'confirm',
      async () => {
        await performMultipleDelete();
        hideCustomAlert();
      },
      () => {
        hideCustomAlert();
      }
    );
  };

  const performMultipleDelete = async () => {

    const messagesToDelete = Array.from(selectedMessages);
    let successCount = 0;
    let errorCount = 0;

    for (const msgId of messagesToDelete) {
      try {
        // Check if it's a temporary message
        if (msgId.toString().startsWith('temp-')) {
          successCount++;
          continue;
        }

        await api.delete(`/messages/${msgId}`);
        successCount++;
      } catch (err) {
        console.error(`Failed to delete message ${msgId}:`, err);
        
        // If 404, count as success since it's already gone
        if (err.response?.status === 404) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    // Remove all selected messages from UI
    setMessages(prev => prev.filter(m => !selectedMessages.has(m._id)));
    
    // Reset selection
    setSelectedMessages(new Set());
    setIsMultiSelectMode(false);

    // Show result
    if (errorCount > 0) {
      showCustomAlert(`Deleted ${successCount} messages. ${errorCount} failed to delete.`, 'error');
    } else {
      showSuccessMessage(`Successfully deleted ${successCount} message${successCount > 1 ? 's' : ''}`);
    }
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
    setIsMultiSelectMode(false);
  };

  // Custom alert system
  const showCustomAlert = (message, type = 'confirm', onConfirm = null, onCancel = null) => {
    setCustomAlert({
      message,
      type, // 'confirm', 'success', 'error'
      onConfirm,
      onCancel
    });
  };

  const hideCustomAlert = () => {
    setCustomAlert(null);
  };

  const showSuccessMessage = (message) => {
    const notification = {
      id: Date.now(),
      message,
      type: 'success',
      timestamp: new Date(),
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-dark-900 relative">
      {/* Notification Display */}
      {notifications.length > 0 && (
        <div className="absolute top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-3 shadow-lg animate-slide-in-right max-w-sm ${
                notification.type === 'success' 
                  ? 'bg-green-900/50 border-green-500/30' 
                  : 'bg-dark-700 border-accent-purple/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notification.type === 'success' ? (
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">
                        {notification.from?.[0]?.toUpperCase() || 'M'}
                      </span>
                    </div>
                  )}
                  <div>
                    {notification.type === 'success' ? (
                      <p className="text-green-400 font-medium text-sm">{notification.message}</p>
                    ) : (
                      <>
                        <p className="text-white font-medium text-sm">{notification.from}</p>
                        <p className="text-gray-300 text-xs">{notification.message}</p>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              {customAlert.type === 'confirm' && (
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-yellow-500" />
                </div>
              )}
              {customAlert.type === 'success' && (
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
              )}
              {customAlert.type === 'error' && (
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <X className="w-5 h-5 text-red-500" />
                </div>
              )}
              <div>
                <h3 className="text-white font-semibold">
                  {customAlert.type === 'confirm' && 'Confirm Delete'}
                  {customAlert.type === 'success' && 'Success'}
                  {customAlert.type === 'error' && 'Error'}
                </h3>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">{customAlert.message}</p>
            
            <div className="flex gap-3 justify-end">
              {customAlert.type === 'confirm' && (
                <>
                  <button
                    onClick={customAlert.onCancel}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={customAlert.onConfirm}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                  >
                    Delete
                  </button>
                </>
              )}
              {(customAlert.type === 'success' || customAlert.type === 'error') && (
                <button
                  onClick={hideCustomAlert}
                  className="px-4 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-all"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversations Sidebar */}
      <div className="w-80 bg-dark-800 border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Messages</h3>
            {(() => {
              const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
              return totalUnread > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 bg-accent-purple/20 rounded-lg">
                  <div className="w-2 h-2 bg-accent-purple rounded-full animate-pulse"></div>
                  <span className="text-accent-purple text-xs font-medium">
                    {totalUnread} unread
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
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
                onClick={async () => {
                  setSelectedConversation(conv.id);
                  
                  // Mark messages as read in backend
                  try {
                    await api.put(`/messages/mark-read/${agentId}/${conv.id}`);
                  } catch (err) {
                    console.error("Failed to mark messages as read:", err);
                  }
                  
                  // Clear unread count in conversation list
                  setConversations(prev => 
                    prev.map(c => 
                      c.id === conv.id 
                        ? { ...c, unread: 0 }
                        : c
                    )
                  );
                }}
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
                {(conv.unread || 0) > 0 && (
                  <div className="w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xs text-white font-bold">
                      {conv.unread || 0}
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
              
              {/* Multi-select controls */}
              <div className="flex items-center gap-3">
                {isMultiSelectMode ? (
                  <>
                    {/* Left side - Select All */}
                    <button
                      onClick={() => {
                        const allMessageIds = new Set(messages.map(m => m._id));
                        setSelectedMessages(allMessageIds);
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm rounded-lg transition-all"
                    >
                      <Check size={16} />
                      Select All
                    </button>
                    
                    {/* Center - Delete */}
                    <button
                      onClick={handleMultipleDelete}
                      disabled={selectedMessages.size === 0}
                      className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                      Delete ({selectedMessages.size})
                    </button>
                    
                    {/* Right side - Cancel */}
                    <button
                      onClick={clearSelection}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-all"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsMultiSelectMode(true)}
                    className="flex items-center gap-2 px-3 py-1 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm rounded-lg transition-all"
                    title="Delete multiple messages"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
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
                      className={`flex group mb-4 ${
                        isSender ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Multi-select checkbox */}
                      {isMultiSelectMode && (
                        <div className={`flex items-start pt-2 ${isSender ? 'order-2 ml-2' : 'mr-2'}`}>
                          <input
                            type="checkbox"
                            checked={selectedMessages.has(msg._id)}
                            onChange={() => toggleMessageSelection(msg._id)}
                            className="w-4 h-4 text-accent-purple bg-dark-700 border-gray-600 rounded focus:ring-accent-purple focus:ring-2"
                          />
                        </div>
                      )}
                      
                      <div className="relative">
                        {/* Message bubble */}
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                            isSender
                              ? "bg-gradient-to-r from-accent-purple to-accent-blue text-white rounded-br-none"
                              : "bg-dark-700 text-gray-100 rounded-bl-none"
                          }`}
                          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                        >
                          {!isSender && (
                            <div className="text-xs font-medium text-accent-purple mb-2">
                              {msg.from}
                            </div>
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
                            <div className="text-sm break-words mb-1">
                              {msg.message}
                            </div>
                          )}

                          <div className={`text-xs ${
                              isSender ? "text-white/70" : "text-gray-500"
                            }`}>
                            {formatTime(msg.timestamp)}
                          </div>
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
