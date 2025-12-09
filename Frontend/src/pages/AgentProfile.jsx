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
} from "lucide-react";
import api from "../services/api";
import { io } from "socket.io-client";

// Initialize socket
const socket = io(
  import.meta.env.VITE_BACKEND_URL || "http://172.20.47.19:5000",
  {
    autoConnect: true,
  }
);

export default function AgentProfile() {
  const userData = JSON.parse(localStorage.getItem("agent")) || {};
  const username = localStorage.getItem("username") || "Agent";
  const token = localStorage.getItem("token");

  // Connect socket
  useEffect(() => {
    if (username) {
      socket.io.opts.query = { agentId: username };
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, [username]);

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
    setStatus("away");

    // Update status in backend
    try {
      await api.put(
        "/auth/status",
        { status: "away" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      socket.emit("updateStatus", { status: "away" });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const endBreak = async () => {
    setIsOnBreak(false);
    setBreakTime(0);
    setStatus("available");

    // Update status in backend
    try {
      await api.put(
        "/auth/status",
        { status: "available" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      socket.emit("updateStatus", { status: "available" });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const save = async () => {
    localStorage.setItem(
      "agent",
      JSON.stringify({ name, email, extension, status, notifications })
    );

    // If status changed manually
    if (status !== userData.status) {
      try {
        await api.put(
          "/auth/status",
          { status },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        socket.emit("updateStatus", { status });
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    }

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Agent Profile</h1>
        <p className="text-gray-400">Manage your account settings and status</p>
      </div>

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
                className={`w-2 h-2 rounded-full bg-${
                  statusOptions.find((s) => s.value === status)?.color ||
                  "gray-400"
                }`}
              />
              <span className="text-sm text-gray-300 capitalize">{status}</span>
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
            </label>
            <div className="grid grid-cols-3 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !isOnBreak && setStatus(option.value)}
                  disabled={isOnBreak}
                  className={`p-4 rounded-xl border transition-all ${
                    status === option.value
                      ? `bg-${option.color}/20 border-${option.color}/50 text-${option.color}`
                      : "bg-dark-700 border-white/10 text-gray-400 hover:bg-dark-600"
                  } ${isOnBreak ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-${option.color} mx-auto mb-2`}
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
