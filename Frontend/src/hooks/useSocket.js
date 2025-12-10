import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export default function useSocket() {
  const socket = useMemo(() => io("/"), []);

  useEffect(() => {
    return () => socket.disconnect();
  }, [socket]);

  return socket;
}
