import { useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";
import {
  PhoneCall,
  Clock,
  Users,
  TrendingUp,
  PhoneIncoming,
  PhoneMissed,
  User,
} from "lucide-react";

export default function QueueMonitor() {
  const socket = useSocket();
  const [queueData, setQueueData] = useState({
    callers: [],
    members: [],
    stats: {
      totalCalls: 0,
      answered: 0,
      abandoned: 0,
      avgWaitTime: "0:00",
    },
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit("queue:request_status");

    socket.on("queue:status", (data) => {
      setQueueData(data);
    });

    return () => socket.off("queue:status");
  }, [socket]);

  const statCards = [
    {
      icon: PhoneCall,
      label: "Total Calls",
      value: queueData.stats.totalCalls || 0,
      color: "accent-purple",
    },
    {
      icon: PhoneIncoming,
      label: "Answered",
      value: queueData.stats.answered || 0,
      color: "accent-green",
    },
    {
      icon: PhoneMissed,
      label: "Abandoned",
      value: queueData.stats.abandoned || 0,
      color: "accent-red",
    },
    {
      icon: Clock,
      label: "Avg Wait",
      value: queueData.stats.avgWaitTime || "0:00",
      color: "accent-blue",
    },
  ];

  const getStatusBadge = (state) => {
    const states = {
      available: { class: "badge-available", label: "Available" },
      busy: { class: "badge-busy", label: "On Call" },
      away: { class: "badge-away", label: "Away" },
      ringing: { class: "badge-away", label: "Ringing" },
    };
    return states[state?.toLowerCase()] || { class: "badge-away", label: state };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue Monitor</h1>
          <p className="text-gray-400">Real-time queue status and agent availability</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-purple/20 rounded-xl border border-accent-purple/30">
          <div className="w-2 h-2 bg-accent-purple rounded-full animate-pulse" />
          <span className="text-accent-purple text-sm font-medium">Live Updates</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="stat-card animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className={`w-12 h-12 rounded-xl bg-${stat.color}/20 flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting Callers */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <PhoneIncoming className="w-5 h-5 text-accent-purple" />
              Waiting Callers
            </h2>
            <span className="px-3 py-1 bg-accent-purple/20 text-accent-purple text-sm font-medium rounded-full">
              {queueData.callers.length} in queue
            </span>
          </div>

          {queueData.callers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <PhoneCall className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No callers in queue</p>
              <p className="text-gray-500 text-sm mt-1">All lines are clear</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueData.callers.map((caller, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-purple/20 rounded-full flex items-center justify-center">
                      <PhoneCall className="w-5 h-5 text-accent-purple animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{caller.caller}</p>
                      <p className="text-sm text-gray-400">Position #{idx + 1}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-accent-orange">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{caller.wait}s</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agents */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-blue" />
              Agents
            </h2>
            <span className="px-3 py-1 bg-accent-blue/20 text-accent-blue text-sm font-medium rounded-full">
              {queueData.members.length} agents
            </span>
          </div>

          {queueData.members.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No agents online</p>
              <p className="text-gray-500 text-sm mt-1">Waiting for agents to connect</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueData.members.map((member, idx) => {
                const status = getStatusBadge(member.state);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {member.name?.[0]?.toUpperCase() || "A"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-sm text-gray-400">Extension: {member.extension || "N/A"}</p>
                      </div>
                    </div>
                    <span className={`badge ${status.class}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
