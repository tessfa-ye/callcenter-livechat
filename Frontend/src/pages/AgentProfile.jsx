import { useState } from "react";

export default function AgentProfile() {
  const userData = JSON.parse(localStorage.getItem("agent")) || {};

  const [name, setName] = useState(userData.name || "");
  const [status, setStatus] = useState(userData.status || "available");

  const save = () => {
    localStorage.setItem("agent", JSON.stringify({ name, status }));
    alert("Profile updated!");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Agent Profile</h2>

      <label>Name:</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <br />
      <br />

      <label>Status:</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="available">Available</option>
        <option value="busy">Busy</option>
        <option value="away">Away</option>
      </select>

      <br />
      <br />

      <button onClick={save}>Save</button>
    </div>
  );
}
