import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  User,
  LogOut,
  Headphones,
  Circle,
  AlertTriangle,
} from "lucide-react";
import useSessionTimeout from "../hooks/useSessionTimeout";
import useSocket, { disconnectSocket } from "../hooks/useSocket";
import api from "../services/api";

export default function Layout() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Agent";
  const [agentStatus, setAgentStatus] = useState("offline");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const socket = useSocket(username);
  
  // Settings state from admin
  const [adminSettings, setAdminSettings] = useState({
    general: {
      sessionTimeout: 60,
      autoLogout: 30
    }
  });
  const [settingsNotification, setSettingsNotification] = useState(null);

  // Session timeout for security
  useSessionTimeout();

  // Initialize agent status and listen for updates
  useEffect(() => {
    if (username && username !== "Agent") {
      // Set initial UI status
      setAgentStatus("available");
      
      // Listen for status updates from server
      if (socket) {
        // Define data fetching functions FIRST
        const fetchUnreadCount = async () => {
          try {
            const token = localStorage.getItem("token");
            const res = await api.get(`/messages/conversations/${username}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const conversations = res.data || [];
            const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
            setUnreadMessageCount(totalUnread);
            console.log("📊 Loaded unread count:", totalUnread);
          } catch (err) {
            console.error("Failed to fetch unread count:", err);
          }
        };

        const fetchCurrentSettings = async () => {
          try {
            const token = localStorage.getItem("token");
            const res = await api.get("/settings", {
              headers: { Authorization: `Bearer ${token}` },
            });
            setAdminSettings(res.data);
          } catch (err) {
            console.error("Failed to fetch settings:", err);
          }
        };

        // NOW set up socket listeners
        socket.on("agent:status_update", (data) => {
          if (data.username === username) {
            setAgentStatus(data.status);
            
            // If this user was logged out from another session, redirect to login
            if (data.status === "offline" && data.action === "logout") {
              localStorage.removeItem("token");
              localStorage.removeItem("username");
              localStorage.removeItem("role");
              localStorage.removeItem("agent");
              window.location.href = "/login";
            }
          }
        });

        // Listen for real-time settings updates from admin
        socket.on("settings:updated", (data) => {
          console.log("📡 Layout received settings update:", data);
          
          if (data.category === "general") {
            setAdminSettings(prev => ({
              ...prev,
              general: data.settings
            }));

            // Show notification about general settings change
            setSettingsNotification(`System settings updated by admin`);
            setTimeout(() => setSettingsNotification(null), 4000);
          }
        });

        // Listen for incoming messages to show notification badge
        socket.on("receiveMessage", (msg) => {
          // Only count if message is incoming (not from current user)
          if (msg.from !== username) {
            // Increment unread count
            setUnreadMessageCount(prev => prev + 1);
          }
        });

        // Listen for messages being marked as read to update badge
        socket.on("messages:read", () => {
          // Refetch unread count to get accurate number
          fetchUnreadCount();
        });

        // FINALLY, fetch initial data immediately
        // Don't wait for connection event - socket singleton is already connected
        console.log("🚀 Fetching initial data for:", username);
        fetchCurrentSettings();
        fetchUnreadCount();
      }
    }

    return () => {
      if (socket) {
        socket.off("agent:status_update");
        socket.off("settings:updated");
        socket.off("receiveMessage");
        socket.off("messages:read");
      }
    };
  }, [username, socket]);



  const handleLogout = async () => {
    // Set status to offline before logout and wait for confirmation
    if (socket) {
      try {
        // Update status in database first
        const token = localStorage.getItem("token");
        if (token) {
          await api.put("/auth/status", { status: "offline" }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        // Then emit socket update
        socket.emit("updateStatus", { status: "offline" });
        
        // Wait a moment for the update to be processed
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error("Error updating status during logout:", err);
      }
    }
    
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("agent");
    
    // Disconnect singleton socket
    disconnectSocket();
    
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/messaging", icon: MessageSquare, label: "Messaging" },
    { path: "/queue", icon: PhoneCall, label: "Queue Monitor" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="flex h-screen bg-dark-900">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">CallCenter</h1>
              <p className="text-xs text-gray-500">Pro Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                // Clear unread count when navigating to messaging
                if (item.path === "/messaging") {
                  setUnreadMessageCount(0);
                }
              }}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {/* Unread badge for Messaging */}
              {item.path === "/messaging" && unreadMessageCount > 0 && (
                <div className="ml-auto w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-xs text-white font-bold">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {username[0]?.toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-dark-800 ${
                agentStatus === "available" ? "bg-accent-green" :
                agentStatus === "busy" ? "bg-accent-orange" :
                agentStatus === "away" ? "bg-yellow-400" : "bg-gray-500"
              }`}></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {username}
              </p>
              <p className="text-xs text-gray-500 capitalize">{agentStatus}</p>
            </div>
          </div>
          

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Settings Notification */}
        {settingsNotification && (
          <div className="m-6 mb-0 bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-accent-blue font-medium text-sm">Settings Updated</h3>
                <p className="text-accent-blue/80 text-xs mt-1">{settingsNotification}</p>
              </div>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
