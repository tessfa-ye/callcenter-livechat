# Comprehensive Code Walkthrough & Data Flow

This document explains the **complete flow** of the application, how data moves between pages, and the "Basic Code" behind every major feature. Use this to explain the *architecture* to your boss.

---

## 1. Application Architecture (The Big Picture)

**Flow:** `User Action` -> `React Component` -> `Hook/Service` -> `Node.js Backend` -> `Database / Asterisk`

| Layer | Technology | Key Files | Purpose |
| :--- | :--- | :--- | :--- |
| **UI** | React (Vite) | `App.jsx`, `Dashboard.jsx`, `Dialpad.jsx` | What the user sees. |
| **Logic** | Custom Hooks | `useSIP.js`, `useSocket.js` | The "brains" (Calling, Real-time events). |
| **API** | Express Router | `routes/*.js` | Handles HTTP requests (Login, Stats). |
| **Server** | Node.js | `server.js` | Connects everything (Sockets + DB). |
| **Telecom** | Asterisk AMI | `asteriskService.js` | Talks to the Phone System. |

---

## 2. The Flows (How it works step-by-step)

### 🔄 Scenario A: Logging In & Getting Online
**Goal:** User logs in and immediately appears "Online" to everyone else.

1.  **Page:** `Login.jsx`
    *   Submits username/password to `POST /api/auth/login`.
    *   Saves JWT token to `localStorage`.
2.  **Routing:** `App.jsx`
    *   `ProtectedRoute` checks token -> redirects to `/dashboard`.
3.  **Real-time Logic:** `Dashboard.jsx` -> `useSocket.js`
    *   **Code:** `socket.connect()`
    *   **Backend (`server.js`):**
        ```javascript
        io.on("connection", (socket) => {
            // 1. Join user's personal room
            socket.join(agentId);
            // 2. Auto-set status in DB
            User.findOneAndUpdate(..., { status: "available" });
            // 3. BLAST "Login" event to everyone
            io.emit("agent:status_update", { action: "login" });
        });
        ```
    *   **Result:** Every other agent's dashboard instantly updates to show this user is green (Available).

### 📞 Scenario B: Making a Voice Call with Hold/Swap
**Goal:** Agent 102 calls Agent 103, then swaps to a second call.

1.  **UI:** `Dialpad.jsx`
    *   User types number, clicks Call.
    *   Calls `onCall()` prop -> triggers `useSIP.makeCall()`.
2.  **Logic:** `useSIP.js` (The Engine)
    *   **Code (Make Call):**
        ```javascript
        const ua = new UserAgent(...); // Connects to Asterisk WebSocket
        const inviter = new Inviter(ua, targetURI, ...);
        inviter.invite(); // Sends SIP INVITE
        ```
3.  **Server:** Asterisk PBX
    *   Receives INVITE, rings Agent 103.
    *   Bridges audio (RTP).
4.  **Feature:** **Call Waiting / Swap** (The Complex Part)
    *   **Logic (`useSIP.js`):**
        ```javascript
        const swapCalls = useCallback(() => {
            // 1. Send SIP Re-INVITE with "Hold" header to Active Call
            currentActive.invite({ sessionDescriptionHandlerOptions: { hold: true } });

            // 2. Send SIP Re-INVITE with "No Hold" to Held Call
            currentHeld.invite({ sessionDescriptionHandlerOptions: { hold: false } });
        });
        ```
    *   **UI Update (`Dialpad.jsx`):**
        *   Shows **Yellow "On Hold"** panel for the held session.
        *   Swaps the main timer and name to the new active session.

### 💬 Scenario C: Instant Messaging (Backend Routing)
**Goal:** Chat flows from User A -> Server -> User B.

1.  **Page:** `Messaging.jsx`
    *   User types "Hello" -> `socket.emit("sendMessage", ...)`
2.  **Backend:** `server.js`
    *   **Code:**
        ```javascript
        socket.on("sendMessage", async ({ to, message }) => {
            // 1. Persistence: Save to MongoDB so it's never lost
            await Message.create({ from, to, message });

            // 2. Delivery: Send to specific Recipient's Socket Room
            io.to(to).emit("receiveMessage", ...);
        });
        ```
3.  **Recipient:** `Messaging.jsx`
    *   `socket.on("receiveMessage")` fires.
    *   React state updates -> Message bubble appears instantly.

---

## 3. Important Files to Show (The "Basic Code")

### 1. `Frontend/src/hooks/useSIP.js`
**Why:** This is the most impressive file. It turns the browser into a phone.
**Show:** The `swapCalls` function and `handleIncomingCall`.

### 2. `Frontend/src/components/Dialpad.jsx`
**Why:** This shows how you handle UI states (In-call, Ringing, Connected, Keypad).
**Show:** The conditional rendering:
```javascript
if (activeCallStatus === "connected") {
    return <InCallUI ... />;
} else {
    return <KeypadUI ... />;
}
```

### 3. `Backend/server.js`
**Why:** This shows the real-time power.
**Show:** The `ami.on("managerevent")` block that captures phone system events and pushes them to the web.

### 4. `Frontend/src/App.jsx`
**Why:** Shows security and navigation.
**Show:** The `ProtectedRoute` component that blocks access if not logged in.
```javascript
function ProtectedRoute({ children }) {
  if (!token) return <Navigate to="/login" />;
  return children;
}
```
