import { useState, useEffect } from "react";
import useSocket from "../hooks/useSocket";
import CallPopup from "../components/CallPopup";

export default function Dashboard() {
  const socket = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("queue:new_call", (data) => {
      setIncomingCall(data);
    });
  }, [socket]);

  return (
    <div style={{ padding: 40 }}>
      <h2>Agent Dashboard</h2>

      {incomingCall && (
        <CallPopup
          caller={incomingCall.caller}
          onAccept={() => alert("Call accepted")}
          onReject={() => alert("Call rejected")}
        />
      )}
    </div>
  );
}
