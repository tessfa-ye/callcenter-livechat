import { useState, useEffect } from "react";
import api from "../../services/api";
import { io } from "socket.io-client";
import {
  Users,
  PhoneCall,
  Clock,
  TrendingUp,
  Activity,
  UserCheck,
  UserX,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAgents: 0,
    onlineAgents: 0,
    offlineAgents: 0,
    activeCalls: 0,
    totalCallsToday: 0,
  });


  const [activeAgents, setActiveAgents] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]); // Real-time calls list
  const [systemStatus, setSystemStatus] = useState({
    server: { status: "unknown" },
    database: { status: "unknown" },
    asterisk: { status: "unknown" },
    websocket: { status: "unknown" }
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());


  // Calculate real-time stats from activeAgents
  const realTimeStats = {
    onlineAgents: activeAgents.length,
    offlineAgents: Math.max(0, stats.totalAgents - activeAgents.length)
  };



  useEffect(() => {
    fetchStats();
    fetchStats();
    fetchActiveAgents();
    fetchSystemStatus(); // Initial fetch
    
    // Setup Socket.IO for real-time updates
    const socket = io("/", {
      query: { agentId: "admin" },
      path: "/socket.io",
      transports: ['websocket', 'polling'] // Ensure reliable connection
    });

    // Connection event listeners
    socket.on("connect", () => {
      // Connected
    });

    socket.on("disconnect", () => {
       // Disconnected
    });

    // Listen for data refresh events to ensure consistency
    socket.on("agent:data_refresh", () => {
      fetchActiveAgents();
      fetchStats();
    });

    // Listen for agent status updates
    socket.on("agent:status_update", (data) => {
      setLastUpdate(new Date());
      
      // Handle login/logout events
      if (data.action === "login") {
        // Force refresh of agent data immediately
        fetchActiveAgents();
        fetchStats();
        
      } else if (data.action === "logout") {
        // Immediately remove the agent from the active list
        setActiveAgents(prev => {
          const filtered = prev.filter(agent => agent.username !== data.username);
          return filtered;
        });
        
        // Also refresh data to ensure consistency
        fetchActiveAgents();
        fetchStats();
        
      } else {
        // Regular status update (available, busy, away)
        // Force refresh to ensure consistency
        fetchActiveAgents();
        fetchStats();
      }
    });

    // Auto-refresh every 10 seconds to catch any missed updates
    const interval = setInterval(() => {
      fetchStats();
      fetchActiveAgents();
      fetchSystemStatus();
    }, 10000);
    
    return () => {
      socket.off("agent:status_update");
      socket.off("agent:data_refresh");
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      // Add timestamp to prevent caching
      const res = await api.get(`/admin/stats?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };





  const fetchActiveAgents = async () => {
    try {
      const token = localStorage.getItem("token");
      // Add timestamp to prevent caching
      const res = await api.get(`/admin/agents-online?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveAgents(res.data);
    } catch (err) {
      console.error("Failed to fetch active agents:", err);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/admin/system-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSystemStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    }
  };





  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getAgentStatusColor = (status) => {
    switch (status) {
      case "available":
        return "text-accent-green";
      case "busy":
        return "text-accent-orange";
      case "away":
        return "text-yellow-400";
      case "offline":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  const getAgentStatusBadge = (status) => {
    switch (status) {
      case "available":
        return "badge badge-available";
      case "busy":
        return "badge badge-busy";
      case "away":
        return "badge badge-away";
      case "offline":
        return "badge badge-offline";
      default:
        return "badge badge-offline";
    }
  };



  const statCards = [
    {
      icon: Users,
      label: "Total Agents",
      value: stats.totalAgents,
      color: "accent-purple",
      bg: "from-accent-purple/20 to-accent-blue/20",
    },
    {
      icon: UserCheck,
      label: "Online Agents",
      value: realTimeStats.onlineAgents,
      color: "accent-green",
      bg: "from-accent-green/20 to-accent-cyan/20",
    },
    {
      icon: UserX,
      label: "Offline Agents",
      value: realTimeStats.offlineAgents,
      color: "accent-orange",
      bg: "from-accent-orange/20 to-accent-red/20",
    },
    {
      icon: PhoneCall,
      label: "Active Calls",
      value: stats.activeCalls || 0,
      color: "accent-blue",
      bg: "from-accent-blue/20 to-accent-indigo/20",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400">System overview and management</p>
        </div>
        

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-white">
              {loading ? "..." : stat.value}
            </p>
            <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>





      {/* Active Agents Section */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Active Agents</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></div>
              <span className="text-xs text-accent-green">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {activeAgents.length} online
            </span>
            <span className="text-xs text-gray-500">
              Updated {formatTimeAgo(lastUpdate)} • Stats: {stats.onlineAgents} | Agents: {activeAgents.length}
            </span>
            <button 
              onClick={fetchActiveAgents}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {activeAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeAgents.map((agent) => {
              const isNewlyConnected = agent._id?.startsWith('temp-');
              return (
                <div 
                  key={agent._id} 
                  className={`bg-dark-700/50 rounded-xl p-4 border transition-all duration-500 ${
                    isNewlyConnected 
                      ? "border-accent-green/50 shadow-lg shadow-accent-green/20 animate-pulse" 
                      : "border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {agent.username[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-dark-700 ${
                        agent.status === "available" ? "bg-accent-green animate-pulse" :
                        agent.status === "busy" ? "bg-accent-orange" :
                        agent.status === "away" ? "bg-yellow-400" : "bg-gray-500"
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate">{agent.username}</p>
                        {isNewlyConnected && (
                          <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">Ext: {agent.extension || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Status:</span>
                      <span className={`text-xs font-medium capitalize ${getAgentStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Last Seen:</span>
                      <span className="text-xs text-white">
                        {formatTimeAgo(agent.lastSeen)}
                      </span>
                    </div>
                    
                    {agent.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Email:</span>
                        <span className="text-xs text-white truncate max-w-24" title={agent.email}>
                          {agent.email}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className={getAgentStatusBadge(agent.status)}>
                      {agent.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No agents currently online</p>
            <p className="text-sm text-gray-500 mt-1">Agents will appear here when they log in</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Management */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/agents"
              className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-purple" />
              </div>
              <div>
                <p className="font-medium text-white">Manage Agents</p>
                <p className="text-sm text-gray-400">Add, edit, or remove agents</p>
              </div>
            </a>
            <div className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-accent-blue/20 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <p className="font-medium text-white">View Call Logs</p>
                <p className="text-sm text-gray-400">Review call history and recordings</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <p className="font-medium text-white">Performance Reports</p>
                <p className="text-sm text-gray-400">View analytics and metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        

    </div>
  );
}


