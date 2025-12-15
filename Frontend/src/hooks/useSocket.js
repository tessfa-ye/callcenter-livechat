import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export default function useSocket(agentId = null) {
  const socket = useMemo(() => {
    // Get agentId from localStorage if not provided
    const id = agentId || localStorage.getItem("username") || "anonymous";

    return io("/", {
      query: { agentId: id },
      path: "/socket.io",
      transports: ["websocket"], // Force WebSocket to avoid Mixed Content/Polling delay
    });
  }, [agentId]);

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  return socket;
}
