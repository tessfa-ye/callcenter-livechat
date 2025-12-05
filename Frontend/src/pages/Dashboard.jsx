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
} from "lucide-react";

export default function Dashboard() {
  const socket = useSocket();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState(null);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    activeCalls: 12,
    agentsOnline: 8,
    queueLength: 5,
    avgWaitTime: "2:45",
    callsToday: 156,
    resolvedToday: 142,
  });

  useEffect(() => {
    // Fetch agents list
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/auth/agents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAgents(res.data || []);
      } catch (err) {
        // Mock data fallback
        setAgents([
          { _id: "1", username: "Sarah", status: "available", extension: "1001" },
          { _id: "2", username: "Mike", status: "busy", extension: "1002" },
          { _id: "3", username: "Lisa", status: "away", extension: "1003" },
          { _id: "4", username: "David", status: "available", extension: "1004" },
          { _id: "5", username: "Emma", status: "offline", extension: "1005" },
        ]);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("queue:new_call", (data) => {
      setIncomingCall(data);
    });

    socket.on("queue:stats", (data) => {
      setStats((prev) => ({ ...prev, ...data }));
    });

    // Listen for agent status updates
    socket.on("agent:status_update", ({ username, status }) => {
      setAgents((prevAgents) => 
        prevAgents.map(agent => 
          agent.username === username ? { ...agent, status } : agent
        )
      );
    });

    return () => {
      socket.off("queue:new_call");
      socket.off("queue:stats");
      socket.off("agent:status_update");
    };
  }, [socket]);

  const statCards = [
    {
      icon: PhoneCall,
      label: "Active Calls",
      value: stats.activeCalls,
      color: "accent-purple",
      trend: "+12%",
    },
    {
      icon: Users,
      label: "Agents Online",
      value: stats.agentsOnline,
      color: "accent-green",
      trend: null,
    },
    {
      icon: PhoneIncoming,
      label: "Queue Length",
      value: stats.queueLength,
      color: "accent-blue",
      trend: "-5%",
    },
    {
      icon: Clock,
      label: "Avg Wait Time",
      value: stats.avgWaitTime,
      color: "accent-orange",
      trend: "-8%",
    },
  ];

  const getStatusBadge = (status) => {
    const statuses = {
      available: { class: "badge-available", label: "Available" },
      busy: { class: "badge-busy", label: "Busy" },
      away: { class: "badge-away", label: "Away" },
      offline: { class: "bg-gray-500/20 text-gray-400 border border-gray-500/30", label: "Offline" },
    };
    return statuses[status] || statuses.offline;
  };

  const handleMessageAgent = (agent) => {
    navigate(`/messaging?agent=${agent.username}`);
  };

  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, callsRes] = await Promise.all([
          api.get("/calls/stats", { headers }),
          api.get("/calls/recent", { headers })
        ]);

        setStats(prev => ({ ...prev, ...statsRes.data }));
        setRecentCalls(callsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };

    fetchDashboardData();
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
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 rounded-xl border border-accent-green/30">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span className="text-accent-green text-sm font-medium">System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="stat-card animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}/20 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              {stat.trend && (
                <span className={`text-xs font-medium ${stat.trend.startsWith('+') ? 'text-accent-green' : 'text-accent-blue'}`}>
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
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
                    <p className="font-medium text-white text-sm">{call.caller}</p>
                    <p className="text-xs text-gray-400">{call.agent}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-xs">{call.duration}</span>
                  <span
                    className={`block text-xs mt-1 ${
                      call.status === "completed" ? "text-accent-green" : "text-accent-orange"
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
                    <div className="w-9 h-9 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {agent.username[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{agent.username}</p>
                      <p className="text-xs text-gray-400">Ext: {agent.extension || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${status.class}`}>{status.label}</span>
                    <button className="p-1.5 bg-accent-purple/20 text-accent-purple rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Today's Performance</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-accent-green" />
                </div>
                <div>
                  <p className="text-white font-medium">{stats.resolvedToday}</p>
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
    </div>
  );
}
