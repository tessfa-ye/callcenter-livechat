import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  User,
  Mail,
  Phone,
  Lock,
  Check,
  Key,
  RefreshCw,
} from "lucide-react";

export default function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    extension: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAgents();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchAgents = async () => {
    try {
      const res = await api.get("/admin/agents", getAuthHeaders());
      setAgents(res.data);
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editingAgent) {
        // Update agent
        await api.put(`/admin/agents/${editingAgent._id}`, formData, getAuthHeaders());
        setSuccess("Agent updated successfully");
      } else {
        // Create agent
        await api.post("/admin/agents", formData, getAuthHeaders());
        setSuccess("Agent created successfully");
      }
      fetchAgents();
      setTimeout(() => {
        setShowModal(false);
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (agent) => {
    if (!confirm(`Are you sure you want to delete ${agent.username}?`)) return;

    try {
      await api.delete(`/admin/agents/${agent._id}`, getAuthHeaders());
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const openPasswordModal = (agent) => {
    setSelectedAgent(agent);
    setNewPassword("");
    setError("");
    setSuccess("");
    setShowPasswordModal(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.put(`/admin/agents/${selectedAgent._id}/reset-password`, 
        { newPassword }, 
        getAuthHeaders()
      );
      setSuccess("Password reset successfully");
      setTimeout(() => {
        setShowPasswordModal(false);
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    }
  };

  const openCreateModal = () => {
    setEditingAgent(null);
    setFormData({ username: "", password: "", email: "", extension: "" });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (agent) => {
    setEditingAgent(agent);
    setFormData({
      username: agent.username,
      password: "",
      email: agent.email || "",
      extension: agent.extension || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const filteredAgents = agents.filter((agent) =>
    agent.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const statuses = {
      available: { class: "badge-available", label: "Available" },
      busy: { class: "badge-busy", label: "Busy" },
      away: { class: "badge-away", label: "Away" },
      offline: { class: "bg-gray-500/20 text-gray-400 border border-gray-500/30", label: "Offline" },
    };
    return statuses[status] || statuses.offline;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Management</h1>
          <p className="text-gray-400">Add, edit, and manage call center agents</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>Add Agent</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: "3rem" }}
        />
      </div>

      {/* Agents Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Agent</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Email</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Extension</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Loading agents...
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No agents found
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const status = getStatusBadge(agent.status);
                  return (
                    <tr key={agent._id} className="border-b border-white/5 hover:bg-dark-700/30 transition-all">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {agent.username[0]?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white font-medium">{agent.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400">{agent.email || "-"}</td>
                      <td className="py-4 px-6 text-gray-400">{agent.extension || "-"}</td>
                      <td className="py-4 px-6">
                        <span className={`badge ${status.class}`}>{status.label}</span>
                      </td>
                        <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPasswordModal(agent)}
                            className="p-2 text-gray-400 hover:text-accent-orange hover:bg-accent-orange/10 rounded-lg transition-all"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(agent)}
                            className="p-2 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(agent)}
                            className="p-2 text-gray-400 hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingAgent ? "Edit Agent" : "Add New Agent"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-accent-green/10 border border-accent-green/30 rounded-xl text-accent-green text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field"
                    style={{ paddingLeft: "3rem" }}
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {editingAgent && "(leave blank to keep current)"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    style={{ paddingLeft: "3rem" }}
                    placeholder="Enter password"
                    required={!editingAgent}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    style={{ paddingLeft: "3rem" }}
                    placeholder="agent@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Extension (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.extension}
                    onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                    className="input-field"
                    style={{ paddingLeft: "3rem" }}
                    placeholder="1001"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingAgent ? "Update Agent" : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Reset Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 mb-4">
              Resetting password for <span className="text-white font-medium">{selectedAgent.username}</span>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-xl text-accent-red text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-accent-green/10 border border-accent-green/30 rounded-xl text-accent-green text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: "3rem" }}
                    placeholder="Enter new password (min 6 chars)"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
