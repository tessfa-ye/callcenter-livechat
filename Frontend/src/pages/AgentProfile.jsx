import { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  Save,
  CheckCircle,
  Coffee,
  Clock,
  Bell,
  BellOff,
  AlertTriangle,
} from "lucide-react";
import api from "../services/api";
import { io } from "socket.io-client";

// Initialize socket - connect to backend server
// Initialize socket - connect to backend server
const socket = io("/", {
  path: "/socket.io",
  autoConnect: true,
  reconnection: true,
});

export default function AgentProfile() {
  const userData = JSON.parse(localStorage.getItem("agent")) || {};
  const username = localStorage.getItem("username") || "Agent";
  const token = localStorage.getItem("token");

  // Connect socket and listen for status updates and settings changes
  useEffect(() => {
    if (username) {
      socket.io.opts.query = { agentId: username };
      socket.connect();
      
      // Listen for status updates from other sources
      socket.on("agent:status_update", (data) => {
        if (data.username === username) {
          setStatus(data.status);
          // Update localStorage
          const currentData = JSON.parse(localStorage.getItem("agent")) || {};
          localStorage.setItem(
            "agent",
            JSON.stringify({ ...currentData, status: data.status })
          );
          
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
        console.log("📡 Agent received settings update:", data);
        
        if (data.category === "agents") {
          setAdminSettings(prev => ({
            ...prev,
            agents: data.settings
          }));

          // Update break duration if admin changed max break duration
          if (data.settings.maxBreakDuration && data.settings.maxBreakDuration !== breakDuration) {
            setBreakDuration(data.settings.maxBreakDuration);
          }

          // Show notification about settings change
          setSettingsRestriction(`Admin updated agent settings: ${JSON.stringify(data.settings, null, 2)}`);
          setTimeout(() => setSettingsRestriction(null), 5000);

          // If admin disabled status changes and agent is not on default status
          if (!data.settings.allowStatusChange && status !== data.settings.defaultStatus) {
            updateStatus(data.settings.defaultStatus);
            setSettingsRestriction(`Status changed to ${data.settings.defaultStatus} by admin policy`);
          }

          // If admin enabled force break time and agent is available
          if (data.settings.forceBreakTime && status === "available" && !isOnBreak) {
            startBreak();
            setSettingsRestriction("Break time enforced by admin policy");
          }
        }
      });

      // Fetch current settings on load
      fetchCurrentSettings();
    }
    
    return () => {
      socket.off("agent:status_update");
      socket.off("settings:updated");
      socket.disconnect();
    };
  }, [username]);

  // Fetch current admin settings
  const fetchCurrentSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminSettings(res.data);
      
      // Apply current settings
      if (res.data.agents) {
        if (res.data.agents.maxBreakDuration) {
          setBreakDuration(res.data.agents.maxBreakDuration);
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const [name, setName] = useState(userData.name || username);
  const [email, setEmail] = useState(userData.email || "");
  const [extension, setExtension] = useState(userData.extension || "");
  const [status, setStatus] = useState(userData.status || "available");
  const [saved, setSaved] = useState(false);

  // Break timer state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTime, setBreakTime] = useState(0);
  const [breakDuration, setBreakDuration] = useState(15); // minutes

  // Notification state
  const [notifications, setNotifications] = useState(
    userData.notifications ?? true
  );

  // Settings state from admin
  const [adminSettings, setAdminSettings] = useState({
    agents: {
      allowStatusChange: true,
      forceBreakTime: false,
      maxBreakDuration: 15,
      defaultStatus: "available"
    }
  });
  const [settingsRestriction, setSettingsRestriction] = useState(null);

  // Format break time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Break timer effect
  useEffect(() => {
    let interval;
    if (isOnBreak) {
      interval = setInterval(() => {
        setBreakTime((prev) => {
          const newTime = prev + 1;
          // Auto-end break when duration reached
          if (newTime >= breakDuration * 60) {
            endBreak();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOnBreak, breakDuration]);

  const startBreak = async () => {
    setIsOnBreak(true);
    setBreakTime(0);
    await updateStatus("away");
  };

  const endBreak = async () => {
    setIsOnBreak(false);
    setBreakTime(0);
    await updateStatus("available");
  };

  // Handle real-time status updates with admin settings enforcement
  const updateStatus = async (newStatus) => {
    // Check admin restrictions
    if (!adminSettings.agents.allowStatusChange && newStatus !== adminSettings.agents.defaultStatus) {
      setSettingsRestriction("Status changes are restricted by admin policy");
      setTimeout(() => setSettingsRestriction(null), 3000);
      return;
    }

    if (isOnBreak && newStatus !== "away") return; // Prevent status change during break
    
    setStatus(newStatus);
    
    try {
      await api.put(
        "/auth/status",
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      socket.emit("updateStatus", { status: newStatus });
      
      // Update localStorage immediately
      const currentData = JSON.parse(localStorage.getItem("agent")) || {};
      localStorage.setItem(
        "agent",
        JSON.stringify({ ...currentData, status: newStatus })
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      // Revert status on error
      setStatus(status);
    }
  };

  const save = async () => {
    localStorage.setItem(
      "agent",
      JSON.stringify({ name, email, extension, status, notifications })
    );

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statusOptions = [
    { value: "available", label: "Available", color: "accent-green" },
    { value: "busy", label: "Busy", color: "accent-red" },
    { value: "away", label: "Away", color: "accent-orange" },
  ];

  const breakOptions = [5, 10, 15, 30];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Profile</h1>
          <p className="text-gray-400">Manage your account settings and status</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-dark-800/50 rounded-xl border border-white/10">
          <div className={`w-3 h-3 rounded-full ${
            status === "available" ? "bg-accent-green animate-pulse" :
            status === "busy" ? "bg-accent-red" :
            status === "away" ? "bg-accent-orange" : "bg-gray-400"
          }`} />
          <span className="text-sm font-medium text-white">
            {status === "available" ? "Available" :
             status === "busy" ? "Busy" :
             status === "away" ? "Away" : "Offline"}
          </span>
        </div>
      </div>

      {/* Settings Restriction Notification */}
      {settingsRestriction && (
        <div className="mb-6 bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-orange flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-accent-orange font-medium text-sm">Admin Policy Update</h3>
              <p className="text-accent-orange/80 text-xs mt-1">{settingsRestriction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Break Timer Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Coffee className="w-5 h-5 text-accent-orange" />
            Break Timer
          </h2>
          {isOnBreak && <span className="badge badge-away">On Break</span>}
        </div>

        {isOnBreak ? (
          <div className="text-center py-6">
            <div className="text-5xl font-bold text-white mb-2 font-mono">
              {formatTime(breakTime)}
            </div>
            <p className="text-gray-400 mb-6">of {breakDuration} minutes</p>
            <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-gradient-to-r from-accent-orange to-accent-red rounded-full transition-all"
                style={{
                  width: `${(breakTime / (breakDuration * 60)) * 100}%`,
                }}
              />
            </div>
            <button onClick={endBreak} className="btn-primary">
              End Break Early
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-4">Select break duration:</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {breakOptions.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setBreakDuration(mins)}
                  className={`p-3 rounded-xl border transition-all ${
                    breakDuration === mins
                      ? "bg-accent-orange/20 border-accent-orange/50 text-accent-orange"
                      : "bg-dark-700 border-white/10 text-gray-400 hover:bg-dark-600"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <button
              onClick={startBreak}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Clock className="w-5 h-5" />
              Start Break
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="glass-card p-8">
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/10">
          <div className="w-24 h-24 bg-gradient-to-br from-accent-purple to-accent-blue rounded-2xl flex items-center justify-center shadow-glow">
            <span className="text-4xl font-bold text-white">
              {name[0]?.toUpperCase() || "A"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-gray-400">Call Center Agent</p>
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  status === "available" ? "bg-accent-green animate-pulse" :
                  status === "busy" ? "bg-accent-red" :
                  status === "away" ? "bg-accent-orange" : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium text-white capitalize">
                {status === "available" ? "Available" :
                 status === "busy" ? "Busy" :
                 status === "away" ? "Away" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                style={{ paddingLeft: "3rem" }}
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: "3rem" }}
                placeholder="agent@company.com"
              />
            </div>
          </div>

          {/* Extension */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Extension Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="input-field"
                style={{ paddingLeft: "3rem" }}
                placeholder="1001"
              />
            </div>
          </div>

          {/* Notifications Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Notifications
            </label>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`flex items-center gap-3 p-4 rounded-xl border w-full transition-all ${
                notifications
                  ? "bg-accent-green/20 border-accent-green/50 text-accent-green"
                  : "bg-dark-700 border-white/10 text-gray-400"
              }`}
            >
              {notifications ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
              <span className="font-medium">
                {notifications
                  ? "Notifications Enabled"
                  : "Notifications Disabled"}
              </span>
            </button>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Current Status
              {!adminSettings.agents.allowStatusChange && (
                <span className="ml-2 text-xs text-accent-orange">(Admin Restricted)</span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !isOnBreak && updateStatus(option.value)}
                  disabled={isOnBreak || (!adminSettings.agents.allowStatusChange && option.value !== adminSettings.agents.defaultStatus)}
                  className={`p-4 rounded-xl border transition-all transform hover:scale-105 ${
                    status === option.value
                      ? `bg-${option.color}/20 border-${option.color}/50 text-${option.color} shadow-lg`
                      : "bg-dark-700 border-white/10 text-gray-400 hover:bg-dark-600 hover:border-white/20"
                  } ${(isOnBreak || (!adminSettings.agents.allowStatusChange && option.value !== adminSettings.agents.defaultStatus)) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                      status === option.value && option.value === "available" 
                        ? `bg-${option.color} animate-pulse` 
                        : `bg-${option.color}`
                    }`}
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
            {isOnBreak && (
              <p className="text-sm text-gray-500 mt-2">
                Status locked during break
              </p>
            )}
            {!adminSettings.agents.allowStatusChange && (
              <p className="text-sm text-accent-orange mt-2">
                Status changes restricted by admin. Only "{adminSettings.agents.defaultStatus}" allowed.
              </p>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={save}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${
              saved ? "!bg-accent-green" : ""
            }`}
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
