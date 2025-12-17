# Call Center Application - Project Documentation

## 1. Project Overview
**Goal:** Build a modern, web-based Call Center application that allows agents to make voice calls, chat in real-time, and manage their status—all from a browser.

**Core Technology Stack:**
-   **Frontend:** React (Vite), Tailwind CSS
-   **Backend:** Node.js, Express, Socket.IO, MongoDB
-   **Telephony:** Asterisk PBX (VoIP Server)
-   **Communication Protocols:** SIP (Voice), WebRTC (Browser Audio), WebSocket (Real-time Events)

---

## 2. Key Features Implemented

### 📞 Voice Calling (WebRTC)
-   **Browser-to-Anything:** Agents can call other web agents or softphones (like Zoiper).
-   **Key Controls:** Mute, Hold, Swap Calls (Call Waiting), DTMF (Keypad).
-   **Call Waiting:** Handle multiple simultaneous calls with a visible "On Hold" queue and Swap button.
-   **Visuals:** Ringing animations, timer, "Unknown" caller ID handling.

### 💬 Real-time Messaging
-   **Unified Chat:** Chat with other agents instantly.
-   **Persistence:** Messages are saved in MongoDB so history is never lost.
-   **SIP Integration:** Can receive SIP MESSAGE payloads from softphones (Zoiper) and display them in the web chat.

### 👥 Agent Management (Admin)
-   **Dashboard:** Real-time view of who is Online, Busy, or Offline.
-   **Remote Provisioning:** Creating a user in the web app *automatically* SSHs into the Asterisk server and creates a real PJSIP extension. No manual config required.

---

## 3. Technical Challenges & Solutions (The "Wow" Factor)

### 🚀 Challenge 1: The "One-Way Audio" Problem
*   **Issue:** Browsers enforce strict security (DTLS-SRTP) for audio, but standard softphones often use unencrypted RTP. This caused calls to connect but with silence on one side.
*   **Solution:** We implemented a **"Dual-Mode" Configuration**:
    *   **Web Agents:** Forced `webrtc=yes` and encryption.
    *   **Softphones:** Configured with `webrtc=no` (standard RTP).
    *   **Asterisk:** configured to bridge and transcode between the two automatically.

### ⚡ Challenge 2: The "5-Second Delay"
*   **Issue:** When answering a call, it took ~5 seconds to hear audio.
*   **Solution:** Optimized the ICE Gathering Timeout.
    *   The browser was waiting for candidates (STUN/TURN) that weren't needed on the local network.
    *   We reduced the timeout to **200ms**, making call connection **instant**.

### 🔒 Challenge 3: Browser Security (Mixed Content)
*   **Issue:** WebRTC *requires* HTTPS (Secure). Socket.IO was trying to connect via HTTP (Insecure), which browsers block.
*   **Solution:**
    *   Implemented Self-Signed SSL Certificates for localhost.
    *   Configured the Socket.IO client to use a relative path (`/socket.io`) to funnel traffic through the secure proxy.

---

## 4. Live Demo Script (For your presentation)

1.  **Login & Status**:
    *   Show logging in as **Agent 102**.
    *   Show your status going "Online" on the Admin Dashboard instantly (Socket.IO sync).

2.  **The Call Flow**:
    *   Open **Zoiper** (or another browser tab as Agent 103).
    *   Call **102** from **103**.
    *   **Answer** on the web. Show the **Timer** starting instantly.
    *   **Talk**: Demonstrate 2-way audio.

3.  **Call Waiting (Advanced)**:
    *   While talking to 103, call **102** from a third line (e.g., Mobile Zoiper).
    *   Show the **"Incoming Call"** popup on top of the active call.
    *   **Answer**: Show the first call moving to the yellow **"On Hold"** panel.
    *   Click **"Swap"** to toggle between them.

4.  **Admin Power**:
    *   Go to **Admin Dashboard**.
    *   Show the **Active Calls** widget updating in real-time.
