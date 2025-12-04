import { useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";
import QueueInfo from "../components/QueueInfo";

export default function QueueMonitor() {
  const socket = useSocket();
  const [queueData, setQueueData] = useState({
    callers: [],
    members: [],
    stats: {},
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit("queue:request_status");

    socket.on("queue:status", (data) => {
      setQueueData(data);
    });

    return () => socket.off("queue:status");
  }, [socket]);

  return (
    <div style={{ padding: 30 }}>
      <h2>Queue Monitor</h2>

      <QueueInfo
        callers={queueData.callers}
        members={queueData.members}
        stats={queueData.stats}
      />
    </div>
  );
}
