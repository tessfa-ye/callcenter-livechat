import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Messaging from "./pages/Messaging";
import Dashboard from "./pages/Dashboard";
import QueueMonitor from "./pages/QueueMonitor";
import AgentProfile from "./pages/AgentProfile";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AgentManagement from "./pages/admin/AgentManagement";
import AdminSettings from "./pages/admin/Settings";

// Layouts
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={role === "admin" ? "/admin/dashboard" : "/dashboard"} />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Agent routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["agent"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/messaging" element={<Messaging />} />
          <Route path="/queue" element={<QueueMonitor />} />
          <Route path="/profile" element={<AgentProfile />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/agents" element={<AgentManagement />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
