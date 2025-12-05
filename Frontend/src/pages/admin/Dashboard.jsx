import { useState, useEffect } from "react";
import api from "../../services/api";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
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
      value: stats.onlineAgents,
      color: "accent-green",
      bg: "from-accent-green/20 to-accent-cyan/20",
    },
    {
      icon: UserX,
      label: "Offline Agents",
      value: stats.offlineAgents,
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
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-purple/20 rounded-xl border border-accent-purple/30">
          <Activity className="w-4 h-4 text-accent-purple animate-pulse" />
          <span className="text-accent-purple text-sm font-medium">Live Data</span>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
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
          </div>
        </div>

        {/* System Status */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Server Status</span>
              <span className="badge badge-available">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Database</span>
              <span className="badge badge-available">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Asterisk PBX</span>
              <span className="badge badge-available">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">WebSocket</span>
              <span className="badge badge-available">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
