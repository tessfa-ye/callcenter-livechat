import { useState, useEffect } from "react";
import api from "../../services/api";
import { io } from "socket.io-client";
import {
  Settings as SettingsIcon,
  Users,
  Phone,
  Bell,
  Shield,
  Globe,
  Database,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    general: {
      systemName: "Call Center Pro",
      timezone: "UTC",
      language: "English",
      autoLogout: 30,
      sessionTimeout: 60,
    },
    agents: {
      maxAgents: 50,
      defaultStatus: "available",
      allowStatusChange: true,
      forceBreakTime: false,
      maxBreakDuration: 15,
      autoAssignCalls: true,
    },
    calls: {
      recordCalls: true,
      maxCallDuration: 3600,
      callTimeout: 30,
      enableTransfer: true,
      enableConference: true,
      enableHold: true,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      soundAlerts: true,
      newAgentAlert: true,
      systemDownAlert: true,
    },
    security: {
      passwordMinLength: 8,
      requireSpecialChars: true,
      sessionSecurity: "high",
      twoFactorAuth: false,
      ipWhitelist: [],
      loginAttempts: 3,
    },
    asterisk: {
      host: "172.20.47.25",
      amiPort: 5038,
      sipPort: 5060,
      enableSIP: true,
      enableWebRTC: true,
      codecPreference: "ulaw",
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io("/", {
      query: { agentId: "admin" },
      path: "/socket.io",
      autoConnect: true,
      reconnection: true,
    });

    setSocket(newSocket);

    // Listen for settings updates from other admin sessions
    newSocket.on("settings:updated", (data) => {
      console.log("📡 Settings updated from server:", data);
      if (data && data.category && data.settings) {
        setSettings(prev => ({
          ...prev,
          [data.category]: {
            ...(prev[data.category] || {}),
            ...data.settings
          }
        }));
        
        // Show notification that settings were updated
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Merge fetched settings with defaults to ensure all properties exist
      setSettings(prevSettings => ({
        ...prevSettings,
        ...res.data
      }));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      // Keep default settings if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      // Save current tab settings
      const response = await api.put(`/settings/${activeTab}`, {
        settings: settings[activeTab]
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("💾 Settings saved successfully:", response.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Settings will be automatically broadcast to all connected clients via Socket.IO
      // from the backend route handler
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    // Reload settings from server
    await fetchSettings();
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value
      }
    }));
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "agents", label: "Agents", icon: Users },
    { id: "calls", label: "Calls", icon: Phone },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "asterisk", label: "PBX Config", icon: Globe },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure your call center system</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent-green/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-accent-green text-sm">Settings saved</span>
            </div>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/30 rounded-xl text-gray-300 text-sm font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple/20 hover:bg-accent-purple/30 border border-accent-purple/30 rounded-xl text-accent-purple text-sm font-medium transition-all disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-pulse" : ""}`} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Settings Navigation */}
        <div className="w-64 space-y-2">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                    : "text-gray-400 hover:text-white hover:bg-dark-700/50"
                }`}
              >
                <TabIcon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="glass-card p-6">
            {/* General Settings */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">General Settings</h2>
                  <p className="text-gray-400 mb-6">Basic system configuration and preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        System Name
                      </label>
                      <input
                        type="text"
                        value={settings.general?.systemName || ""}
                        onChange={(e) => updateSetting("general", "systemName", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={settings.general?.timezone || "UTC"}
                        onChange={(e) => updateSetting("general", "timezone", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.general?.language || "English"}
                        onChange={(e) => updateSetting("general", "language", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Auto Logout (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.general?.autoLogout || 30}
                        onChange={(e) => updateSetting("general", "autoLogout", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.general?.sessionTimeout || 60}
                        onChange={(e) => updateSetting("general", "sessionTimeout", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Settings */}
            {activeTab === "agents" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Agent Management</h2>
                  <p className="text-gray-400 mb-6">Configure agent behavior and limitations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Maximum Agents
                      </label>
                      <input
                        type="number"
                        value={settings.agents?.maxAgents || 50}
                        onChange={(e) => updateSetting("agents", "maxAgents", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Default Status
                      </label>
                      <select
                        value={settings.agents?.defaultStatus || "available"}
                        onChange={(e) => updateSetting("agents", "defaultStatus", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                      >
                        <option value="available">Available</option>
                        <option value="busy">Busy</option>
                        <option value="away">Away</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.agents?.maxBreakDuration || 15}
                        onChange={(e) => updateSetting("agents", "maxBreakDuration", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Allow Status Change</h3>
                        <p className="text-sm text-gray-400">Let agents change their own status</p>
                      </div>
                      <button
                        onClick={() => updateSetting("agents", "allowStatusChange", !(settings.agents?.allowStatusChange ?? true))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.agents?.allowStatusChange ?? true ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.agents?.allowStatusChange ?? true ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Force Break Time</h3>
                        <p className="text-sm text-gray-400">Automatically set agents on break</p>
                      </div>
                      <button
                        onClick={() => updateSetting("agents", "forceBreakTime", !(settings.agents?.forceBreakTime ?? false))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.agents?.forceBreakTime ?? false ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.agents?.forceBreakTime ?? false ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Auto Assign Calls</h3>
                        <p className="text-sm text-gray-400">Automatically route calls to available agents</p>
                      </div>
                      <button
                        onClick={() => updateSetting("agents", "autoAssignCalls", !(settings.agents?.autoAssignCalls ?? true))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.agents?.autoAssignCalls ?? true ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.agents?.autoAssignCalls ?? true ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Call Settings */}
            {activeTab === "calls" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Call Configuration</h2>
                  <p className="text-gray-400 mb-6">Manage call handling and features</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Call Duration (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.calls?.maxCallDuration || 3600}
                        onChange={(e) => updateSetting("calls", "maxCallDuration", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Call Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.calls.callTimeout}
                        onChange={(e) => updateSetting("calls", "callTimeout", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: "recordCalls", label: "Record Calls", desc: "Automatically record all calls" },
                      { key: "enableTransfer", label: "Enable Transfer", desc: "Allow agents to transfer calls" },
                      { key: "enableConference", label: "Enable Conference", desc: "Allow conference calls" },
                      { key: "enableHold", label: "Enable Hold", desc: "Allow agents to put calls on hold" },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                        <div>
                          <h3 className="text-white font-medium">{setting.label}</h3>
                          <p className="text-sm text-gray-400">{setting.desc}</p>
                        </div>
                        <button
                          onClick={() => updateSetting("calls", setting.key, !settings.calls[setting.key])}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            settings.calls[setting.key] ? "bg-accent-green" : "bg-gray-600"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              settings.calls[setting.key] ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Notifications</h2>
                  <p className="text-gray-400 mb-6">Configure system alerts and notifications</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: "emailNotifications", label: "Email Notifications", desc: "Send notifications via email" },
                    { key: "smsNotifications", label: "SMS Notifications", desc: "Send notifications via SMS" },
                    { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications" },
                    { key: "soundAlerts", label: "Sound Alerts", desc: "Play sound for important events" },
                    { key: "newAgentAlert", label: "New Agent Alert", desc: "Notify when new agents join" },
                    { key: "systemDownAlert", label: "System Down Alert", desc: "Alert when system components fail" },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">{setting.label}</h3>
                        <p className="text-sm text-gray-400">{setting.desc}</p>
                      </div>
                      <button
                        onClick={() => updateSetting("notifications", setting.key, !settings.notifications[setting.key])}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.notifications[setting.key] ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.notifications[setting.key] ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Security</h2>
                  <p className="text-gray-400 mb-6">Configure security policies and authentication</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password Min Length
                      </label>
                      <input
                        type="number"
                        value={settings.security.passwordMinLength}
                        onChange={(e) => updateSetting("security", "passwordMinLength", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Session Security Level
                      </label>
                      <select
                        value={settings.security.sessionSecurity}
                        onChange={(e) => updateSetting("security", "sessionSecurity", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        value={settings.security.loginAttempts}
                        onChange={(e) => updateSetting("security", "loginAttempts", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Require Special Characters</h3>
                        <p className="text-sm text-gray-400">Passwords must contain special characters</p>
                      </div>
                      <button
                        onClick={() => updateSetting("security", "requireSpecialChars", !settings.security.requireSpecialChars)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.security.requireSpecialChars ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.security.requireSpecialChars ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-400">Require 2FA for all users</p>
                      </div>
                      <button
                        onClick={() => updateSetting("security", "twoFactorAuth", !settings.security.twoFactorAuth)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.security.twoFactorAuth ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.security.twoFactorAuth ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Asterisk/PBX Settings */}
            {activeTab === "asterisk" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">PBX Configuration</h2>
                  <p className="text-gray-400 mb-6">Configure Asterisk PBX connection and settings</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Asterisk Host
                      </label>
                      <input
                        type="text"
                        value={settings.asterisk.host}
                        onChange={(e) => updateSetting("asterisk", "host", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        AMI Port
                      </label>
                      <input
                        type="number"
                        value={settings.asterisk.amiPort}
                        onChange={(e) => updateSetting("asterisk", "amiPort", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        SIP Port
                      </label>
                      <input
                        type="number"
                        value={settings.asterisk.sipPort}
                        onChange={(e) => updateSetting("asterisk", "sipPort", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Codec Preference
                      </label>
                      <select
                        value={settings.asterisk.codecPreference}
                        onChange={(e) => updateSetting("asterisk", "codecPreference", e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent-purple"
                      >
                        <option value="ulaw">G.711 μ-law</option>
                        <option value="alaw">G.711 A-law</option>
                        <option value="gsm">GSM</option>
                        <option value="g729">G.729</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Enable SIP</h3>
                        <p className="text-sm text-gray-400">Allow SIP protocol for calls</p>
                      </div>
                      <button
                        onClick={() => updateSetting("asterisk", "enableSIP", !settings.asterisk.enableSIP)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.asterisk.enableSIP ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.asterisk.enableSIP ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl">
                      <div>
                        <h3 className="text-white font-medium">Enable WebRTC</h3>
                        <p className="text-sm text-gray-400">Allow WebRTC calls from browsers</p>
                      </div>
                      <button
                        onClick={() => updateSetting("asterisk", "enableWebRTC", !settings.asterisk.enableWebRTC)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.asterisk.enableWebRTC ? "bg-accent-green" : "bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.asterisk.enableWebRTC ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-accent-blue" />
                        <span className="text-accent-blue font-medium text-sm">Connection Status</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Current connection: <span className="text-accent-green">Connected</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Changes require system restart to take effect
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}