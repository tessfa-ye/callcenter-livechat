import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div
      style={{
        background: "#222",
        color: "white",
        padding: 15,
        display: "flex",
        gap: 20,
      }}
    >
      <Link style={{ color: "white" }} to="/dashboard">
        Dashboard
      </Link>
      <Link style={{ color: "white" }} to="/queue">
        Queue Monitor
      </Link>
      <Link style={{ color: "white" }} to="/profile">
        Profile
      </Link>
    </div>
  );
}
