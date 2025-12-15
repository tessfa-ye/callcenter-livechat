import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useSocket from "../hooks/useSocket";
import CallPopup from "../components/CallPopup";
import api from "../services/api";
import {
  PhoneCall,
  Users,
  Clock,
  PhoneIncoming,
  TrendingUp,
  Activity,
  Headphones,
  CheckCircle,
  MessageSquare,
  Grid,
  Phone,
  PhoneOff,
  AlertTriangle,
  UserX
} from "lucide-react";
import Dialpad from "../components/Dialpad";
import { useSIP } from "../hooks/useSIP";

export default function Dashboard() {
  const username = localStorage.getItem("username");
  const socket = useSocket(username);
  const navigate = useNavigate();

  // SIP / WebRTC
  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  const sipPassword = localStorage.getItem("sipPassword") || "1234";
  const asteriskIp = "172.20.47.25"; // Hardcoded for demo/user config

  const {
    status: sipStatus,
    callStatus,
    makeCall,
    hangup,
    answerCall,
    incomingSession,
    remoteIdentity, // Get persistent identity
    isMuted,
    toggleMute,
    sendDTMF,
    toggleHold,
    isOnHold,
    signalConnected,
    heldSession, // For Call Waiting
    swapCalls,   // For Call Waiting
  } = useSIP(username, sipPassword, asteriskIp);

  const [incomingCall, setIncomingCall] = useState(null);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    activeCalls: 0,
    agentsOnline: 0,
    queueLength: 0,
    avgWaitTime: "0:00",
    callsToday: 0,
    resolvedToday: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Wrapper to open Dialpad on answer
  const handleAnswerCall = () => {
    answerCall();
    setIsDialpadOpen(true);
    // Send instant Socket signal to caller
    if(incomingSession?.remoteIdentity?.uri?.user) {
        socket.emit("call:answered", { to: incomingSession.remoteIdentity.uri.user });
    }
  };

  useEffect(() => {
    // Fetch agents list
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/auth/agents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Filter out the current logged-in user
        const otherAgents = (res.data || []).filter(
          (agent) => agent.username !== username
        );
        setAgents(otherAgents);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
        setAgents([]); // Set empty array instead of mock data
      }
    };
    fetchAgents();
  }, [username]);

  useEffect(() => {
    if (!socket) return;

    // Listen for instant call answer signal
    socket.on("call:answered", ({ from }) => {
        console.log(`⚡ Signal from ${from}`);
        // Visual debug for user
        setSettingsNotification(`⚡ Instant Signal from ${from}!`); 
        
        if ((callStatus === "calling" || callStatus === "incoming") && (remoteIdentity === from || !remoteIdentity)) {
             signalConnected();
        }
    });

    socket.on("queue:new_call", (data) => {
      setIncomingCall(data);
    });
// ... rest of socket listeners

    socket.on("queue:stats", (data) => {
      setStats((prev) => ({ ...prev, ...data }));
    });

    // Listen for agent status updates
    socket.on("agent:status_update", ({ username: updatedUser, status, action }) => {
      console.log(`🔔 Dashboard received status update: ${updatedUser} -> ${status} [${action}]`);
      
      // Show notification if it's another user
      if (updatedUser !== username) {
        let msg = `${updatedUser} is now ${status}`;
        if (action === "login") msg = `${updatedUser} just logged in`;
        if (action === "logout") msg = `${updatedUser} has gone offline`;
        
        setSettingsNotification(msg);
        setTimeout(() => setSettingsNotification(null), 3000);
      }

      // Check if this is a login/logout event or just a status change
      if (action === "login" || action === "logout") {
        // Force re-fetch to update the list (add/remove agent)
        const fetchAgents = async () => {
          try {
            const token = localStorage.getItem("token");
            const res = await api.get("/auth/agents", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const otherAgents = (res.data || []).filter(
              (agent) => agent.username !== username
            );
            setAgents(otherAgents);
          } catch (err) {
            console.error("Failed to refetch agents:", err);
          }
        };
        fetchAgents();
      } else {
        // Just update the status in local state for immediate feedback
        setAgents((prevAgents) =>
          prevAgents.map((agent) =>
            agent.username === updatedUser ? { ...agent, status } : agent
          )
        );
      }
    });

    // Listen for real-time settings updates from admin
    socket.on("settings:updated", (data) => {
      if (data.category === "calls") {
        setAdminSettings(prev => ({
          ...prev,
          calls: data.settings
        }));

        // Show notification about call settings change
        setSettingsNotification(`Call settings updated by admin`);
        setTimeout(() => setSettingsNotification(null), 4000);
      }
    });

    return () => {
      socket.off("queue:new_call");
      socket.off("queue:stats");
      socket.off("agent:status_update");
      socket.off("settings:updated");
    };
  }, [socket, username]);

  // Calculate actual online agents from the agents array
  const actualOnlineAgents = agents.filter(agent => 
    agent.status && ["available", "busy", "away"].includes(agent.status)
  ).length;

  const statCards = [
    {
      icon: PhoneCall,
      label: "Active Calls",
      value: stats.activeCalls || 0,
      color: "accent-purple",
      trend: null,
    },
    {
      icon: Users,
      label: "Agents Online",
      value: actualOnlineAgents,
      color: "accent-green",
      trend: null,
    },
    {
      icon: PhoneIncoming,
      label: "Queue Length",
      value: stats.queueLength || 0,
      color: "accent-blue",
      trend: null,
    },
    {
      icon: Clock,
      label: "Avg Wait Time",
      value: stats.avgWaitTime || "0:00",
      color: "accent-orange",
      trend: null,
    },
  ];

  const getStatusBadge = (status) => {
    const statuses = {
      available: { class: "badge-available", label: "Available" },
      busy: { class: "badge-busy", label: "Busy" },
      away: { class: "badge-away", label: "Away" },
      offline: {
        class: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
        label: "Offline",
      },
    };
    return statuses[status] || statuses.offline;
  };

  const handleMessageAgent = (agent) => {
    navigate(`/messaging?agent=${agent.username}`);
  };

  const [recentCalls, setRecentCalls] = useState([]);
  
  // Settings state from admin
  const [adminSettings, setAdminSettings] = useState({
    calls: {
      enableTransfer: true,
      enableConference: true,
      enableHold: true,
      maxCallDuration: 3600,
      callTimeout: 30
    }
  });
  const [settingsNotification, setSettingsNotification] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingStats(true);
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, callsRes] = await Promise.all([
          api.get("/calls/stats", { headers }),
          api.get("/calls/recent", { headers }),
        ]);

        setStats((prev) => ({ ...prev, ...statsRes.data }));
        setRecentCalls(callsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    // Fetch current settings
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

    fetchDashboardData();
    fetchCurrentSettings();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Real-time call center overview</p>
        </div>
        <div className="flex items-center gap-3">
          {/* SIP Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            sipStatus === "registered" 
              ? "bg-accent-green/20 border-accent-green/30" 
              : sipStatus === "error" 
              ? "bg-red-500/20 border-red-500/30"
              : "bg-yellow-500/20 border-yellow-500/30"
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              sipStatus === "registered" 
                ? "bg-accent-green animate-pulse" 
                : sipStatus === "error" 
                ? "bg-red-500"
                : "bg-yellow-500 animate-pulse"
            }`} />
            <span className={`text-sm font-medium ${
              sipStatus === "registered" 
                ? "text-accent-green" 
                : sipStatus === "error" 
                ? "text-red-400"
                : "text-yellow-400"
            }`}>
              {sipStatus === "registered" ? "Calling Ready" : 
               sipStatus === "error" ? "Calling Offline" : 
               sipStatus === "registering" ? "Connecting..." : 
               sipStatus === "disabled" ? "Calling Disabled" : "Connecting..."}
            </span>
          </div>
          
          <button
            onClick={() => setIsDialpadOpen(true)}
            disabled={sipStatus !== "registered"}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all ${
              sipStatus === "registered"
                ? "bg-gradient-to-r from-accent-purple to-accent-blue hover:shadow-lg hover:shadow-accent-purple/20"
                : "bg-gray-600 cursor-not-allowed opacity-50"
            }`}
            title={sipStatus !== "registered" ? "SIP connection required for calling" : "Open dialpad"}
          >
            <Grid size={16} />
            Dialpad
          </button>
        </div>
      </div>

      {/* Settings Notification */}
      {settingsNotification && (
        <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-accent-blue font-medium text-sm">Settings Updated</h3>
              <p className="text-accent-blue/80 text-xs mt-1">{settingsNotification}</p>
            </div>
          </div>
        </div>
      )}

      {/* SIP Connection Notice */}
      {sipStatus === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <PhoneCall className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <h3 className="text-red-400 font-medium text-sm">Voice Calling Unavailable</h3>
              <p className="text-red-300/80 text-xs mt-1">
                Unable to connect to Asterisk server. Messaging and other features are still available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 rounded-xl bg-${stat.color}/20 flex items-center justify-center`}
              >
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              {stat.trend && (
                <span
                  className={`text-xs font-medium ${
                    stat.trend.startsWith("+")
                      ? "text-accent-green"
                      : "text-accent-blue"
                  }`}
                >
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">
                {isLoadingStats ? "..." : stat.value}
              </p>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Calls</h2>
            <span className="text-sm text-gray-400">Last 4 calls</span>
          </div>
          <div className="space-y-3">
            {recentCalls.map((call, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-dark-600 rounded-full flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">
                      {call.caller}
                    </p>
                    <p className="text-xs text-gray-400">{call.agent}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-xs">{call.duration}</span>
                  <span
                    className={`block text-xs mt-1 ${
                      call.status === "completed"
                        ? "text-accent-green"
                        : "text-accent-orange"
                    }`}
                  >
                    {call.status === "completed" ? "Done" : "Active"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Agents - Click to Message */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-purple" />
              Team Agents
            </h2>
            <span className="text-sm text-gray-400">{agents.length} total</span>
          </div>
          <div className="space-y-3">
            {agents.slice(0, 5).map((agent, idx) => {
              const status = getStatusBadge(agent.status);
              return (
                <div
                  key={agent._id || idx}
                  onClick={() => handleMessageAgent(agent)}
                  className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {agent.username[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-dark-700 ${
                        agent.status === "available" ? "bg-accent-green animate-pulse" :
                        agent.status === "busy" ? "bg-accent-orange" :
                        agent.status === "away" ? "bg-yellow-400" : "bg-gray-500"
                      }`}></div>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">
                        {agent.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        Ext: {agent.extension || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${status.class}`}>
                      {status.label}
                    </span>
                    <button className="p-1.5 bg-accent-purple/20 text-accent-purple rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {agents.length === 0 && (
               <div className="text-center py-8">
                <UserX className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No other agents online</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Today's Performance
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-accent-green" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {stats.resolvedToday}
                  </p>
                  <p className="text-sm text-gray-400">Resolved</p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-accent-green" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-blue/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-accent-blue" />
                </div>
                <div>
                  <p className="text-white font-medium">{stats.callsToday}</p>
                  <p className="text-sm text-gray-400">Total Calls</p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-accent-blue" />
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Resolution Rate</span>
                <span className="text-white font-medium">91%</span>
              </div>
              <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                <div className="h-full w-[91%] bg-gradient-to-r from-accent-purple to-accent-blue rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Call Popup */}
      {incomingCall && (
        <CallPopup
          caller={incomingCall.caller}
          onAccept={() => {
            setIncomingCall(null);
          }}
          onReject={() => {
            setIncomingCall(null);
          }}
        />
      )}
      {/* Incoming Call Modal */}
      {callStatus === "incoming" && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] animate-in fade-in zoom-in">
          <div className="bg-dark-800 p-8 rounded-2xl border border-accent-purple/50 shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <PhoneIncoming className="w-10 h-10 text-accent-green" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Incoming Call
            </h2>
            <p className="text-gray-400 mb-8">
              {incomingSession?.remoteIdentity?.uri?.user || "Unknown"}
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleAnswerCall}
                className="w-14 h-14 rounded-full bg-accent-green flex items-center justify-center text-white hover:scale-110 transition-transform"
              >
                <Phone size={24} fill="currentColor" />
              </button>
              <button
                onClick={hangup}
                className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialpad
        isOpen={isDialpadOpen}
        onClose={() => setIsDialpadOpen(false)}
        onCall={(num) => (num ? makeCall(num) : hangup())}
        activeCallStatus={callStatus}
        toggleMute={toggleMute}
        isMuted={isMuted}
        sendDTMF={sendDTMF}
        callerId={remoteIdentity} // Use persistent identity
        toggleHold={toggleHold}
        isOnHold={isOnHold}
        adminSettings={adminSettings}
        heldCall={heldSession}
        onSwap={swapCalls}
      />
    </div>
  );
}
