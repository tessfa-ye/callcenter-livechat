export default function QueueInfo({ callers, members, stats }) {
  return (
    <div>
      <h3>Queue Summary</h3>
      <p>Total Calls: {stats.totalCalls || 0}</p>
      <p>Answered: {stats.answered || 0}</p>
      <p>Abandoned: {stats.abandoned || 0}</p>

      <hr />

      <h3>Waiting Callers</h3>
      {callers.length === 0 ? (
        <p>No callers in queue.</p>
      ) : (
        <ul>
          {callers.map((c, i) => (
            <li key={i}>
              Caller: {c.caller} — Wait: {c.wait}s
            </li>
          ))}
        </ul>
      )}

      <hr />

      <h3>Agents</h3>
      <ul>
        {members.map((m, i) => (
          <li key={i}>
            {m.name} — {m.state}
          </li>
        ))}
      </ul>
    </div>
  );
}
