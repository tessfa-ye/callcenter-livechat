import { User } from "lucide-react";

export default function AgentCard({ agent }) {
  const getStatusBadge = (status) => {
    const statuses = {
      available: { class: "badge-available", label: "Available" },
      busy: { class: "badge-busy", label: "Busy" },
      away: { class: "badge-away", label: "Away" },
    };
    return statuses[status?.toLowerCase()] || { class: "badge-away", label: status };
  };

  const status = getStatusBadge(agent.status);

  return (
    <div className="glass-card p-4 hover:border-accent-purple/30 transition-all animate-slide-up">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl flex items-center justify-center">
          <span className="text-white font-bold">
            {agent.name?.[0]?.toUpperCase() || "A"}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">{agent.name}</h4>
          <p className="text-sm text-gray-400">
            {agent.extension ? `Ext: ${agent.extension}` : "Agent"}
          </p>
        </div>
        <span className={`badge ${status.class}`}>{status.label}</span>
      </div>
    </div>
  );
}
