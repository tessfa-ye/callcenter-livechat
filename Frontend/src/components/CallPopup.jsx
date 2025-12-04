export default function CallPopup({ caller, onAccept, onReject }) {
  return (
    <div
      style={{ background: "white", padding: 20, border: "1px solid black" }}
    >
      <h3>Incoming Call</h3>
      <p>Caller: {caller}</p>
      <button onClick={onAccept}>Accept</button>
      <button onClick={onReject}>Reject</button>
    </div>
  );
}
