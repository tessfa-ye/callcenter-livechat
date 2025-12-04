export default function AgentCard({ agent }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 20,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <h4>{agent.name}</h4>
      <p>Status: {agent.status}</p>
    </div>
  );
}
