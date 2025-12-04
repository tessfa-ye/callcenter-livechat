import { useState } from "react";
import axios from "axios"; // make sure axios is imported

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);

      // Redirect to messaging page
      window.location.href = "/messaging";
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Agent Login</h2>
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
