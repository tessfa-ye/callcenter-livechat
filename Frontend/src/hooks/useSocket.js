import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Singleton socket instance at module level
let socketInstance = null;
let currentAgentId = null;

export default function useSocket(agentId = null) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Get agentId from parameter or localStorage
    const id = agentId || localStorage.getItem("username") || "anonymous";

    // Only create new socket if agentId changed or socket doesn't exist
    if (!socketInstance || currentAgentId !== id) {
      // Disconnect old socket if exists
      if (socketInstance) {
        console.log("🔄 Disconnecting old socket for:", currentAgentId);
        socketInstance.disconnect();
      }

      console.log("🔌 Creating new socket for:", id);
      currentAgentId = id;

      socketInstance = io("/", {
        query: { agentId: id },
        path: "/socket.io",
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Track connection state
      socketInstance.on("connect", () => {
        console.log("✅ Socket connected:", id);
        setIsConnected(true);
      });

      socketInstance.on("disconnect", () => {
        console.log("❌ Socket disconnected");
        setIsConnected(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("🔴 Socket connection error:", error);
        setIsConnected(false);
      });
    } else {
      // Reuse existing socket, just update connection state
      setIsConnected(socketInstance.connected);
    }

    // Cleanup on unmount - but don't disconnect (other components might be using it)
    return () => {
      // Don't disconnect - let the socket persist across component mounts
    };
  }, [agentId]);

  return socketInstance;
}

// Export function to manually disconnect (for logout)
export function disconnectSocket() {
  if (socketInstance) {
    console.log("🔌 Manually disconnecting socket");
    socketInstance.disconnect();
    socketInstance = null;
    currentAgentId = null;
  }
}
