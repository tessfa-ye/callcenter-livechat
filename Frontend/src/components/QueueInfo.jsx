import {
  PhoneCall,
  Clock,
  Users,
  PhoneIncoming,
  PhoneMissed,
  TrendingUp,
} from "lucide-react";

export default function QueueInfo({ callers, members, stats }) {
  const statItems = [
    {
      icon: PhoneCall,
      label: "Total Calls",
      value: stats.totalCalls || 0,
      color: "accent-purple",
    },
    {
      icon: PhoneIncoming,
      label: "Answered",
      value: stats.answered || 0,
      color: "accent-green",
    },
    {
      icon: PhoneMissed,
      label: "Abandoned",
      value: stats.abandoned || 0,
      color: "accent-red",
    },
  ];

  const getStatusBadge = (state) => {
    const states = {
      available: { class: "badge-available", label: "Available" },
      busy: { class: "badge-busy", label: "On Call" },
      away: { class: "badge-away", label: "Away" },
    };
    return states[state?.toLowerCase()] || { class: "badge-away", label: state };
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statItems.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}/20 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Waiting Callers */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent-orange" />
          Waiting Callers
        </h3>
        {callers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No callers in queue</p>
        ) : (
          <div className="space-y-2">
            {callers.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent-purple/20 rounded-full flex items-center justify-center">
                    <PhoneCall className="w-4 h-4 text-accent-purple" />
                  </div>
                  <span className="text-white">{c.caller}</span>
                </div>
                <span className="text-accent-orange text-sm font-medium">
                  {c.wait}s wait
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agents */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent-blue" />
          Agents
        </h3>
        {members.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No agents online</p>
        ) : (
          <div className="space-y-2">
            {members.map((m, i) => {
              const status = getStatusBadge(m.state);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {m.name?.[0]?.toUpperCase() || "A"}
                      </span>
                    </div>
                    <span className="text-white">{m.name}</span>
                  </div>
                  <span className={`badge ${status.class}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
