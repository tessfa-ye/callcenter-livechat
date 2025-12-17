# Technical Stack Glossary & Locations

This guide defines the core technologies used in your project and tells you exactly **where** they live.

---

## 📞 1. AMI (Asterisk Manager Interface)
**Function:**
The "Remote Control" for your phone server. It allows the Node.js backend to send commands to Asterisk (like "Make a call", "Send stats") and listen for events (like "Phone ringing").
**Where is it?**
*   **File:** [`Backend/server.js`](file:///D:/react/Call-center/Backend/server.js)
*   **Code:** `const ami = new AsteriskManager(...)`

## 🔐 2. SSH (Secure Shell)
**Function:**
A secure way to log into the Linux server remotely. We use it to run the "Create Agent" script automatically when you add a user in the Dashboard.
**Where is it?**
*   **File:** [`Backend/services/asteriskService.js`](file:///D:/react/Call-center/Backend/services/asteriskService.js)
*   **Code:** `conn.exec(cmd, ...)`

## 🎣 3. React Hooks (Custom Hooks)
**Function:**
Reusable "logic blocks" that handle complex tasks so your UI (Dashboard) stays clean. instead of writing connection logic inside every button, we import a Hook.
**Where is it?**
*   **File:** [`Frontend/src/hooks/useSIP.js`](file:///D:/react/Call-center/Frontend/src/hooks/useSIP.js) *(Handles Calling)*
*   **File:** [`Frontend/src/hooks/useSocket.js`](file:///D:/react/Call-center/Frontend/src/hooks/useSocket.js) *(Handles Real-time Data)*

## 🌐 4. React Context
**Function:**
A "Global Store" for data. Instead of passing `user` data down from Parent -> Child -> Grandchild components, Context lets any component grab the `user` data directly.
**Where is it?**
*   **File:** [`Frontend/src/context/AuthContext.jsx`](file:///D:/react/Call-center/Frontend/src/context/AuthContext.jsx)
*   **Code:** `createContext()` and `<AuthContext.Provider>`

## 🔒 5. SSL (Secure Sockets Layer)
**Function:**
Encryption (HTTPS). WebRTC (the audio tech) **will not work** without SSL because browsers block microphone access on insecure (HTTP) sites. We use a plugin to generate a secure certificate for development.
**Where is it?**
*   **File:** [`Frontend/vite.config.js`](file:///D:/react/Call-center/Frontend/vite.config.js)
*   **Code:** `import basicSsl from '@vitejs/plugin-basic-ssl'`

## ⚡ 6. Socket.IO
**Function:**
The "Real-Time Courier". It pushes data instantly between Server and Client without hitting refresh. Used for showing "Online" status and Messages.
**Where is it?**
*   **Server:** [`Backend/server.js`](file:///D:/react/Call-center/Backend/server.js)
*   **Client:** [`Frontend/src/pages/Messaging.jsx`](file:///D:/react/Call-center/Frontend/src/pages/Messaging.jsx)

## 📡 7. WebRTC (Web Real-Time Communication)
**Function:**
The technology that streams audio directly from browser to browser (or browser to server). It uses "ICE Candidates" to find a path through the network.
**Where is it?**
*   **File:** [`Frontend/src/hooks/useSIP.js`](file:///D:/react/Call-center/Frontend/src/hooks/useSIP.js) *(Inside the `sip.js` library usage)*

---

## 💡 Presentation Tips: Other Essential Tech

Here are a few more buzzwords that will make your presentation shine:

### 8. Tailwind CSS
**Function:** A utility-first CSS framework. Instead of writing custom CSS files, we use classes like `flex`, `text-white`, `p-4` directly in the HTML. It makes the UI **Responsive** and **Modern**.
**Where is it?** Used in every `.jsx` file (e.g., `className="bg-dark-900"`).

### 9. MongoDB & Mongoose
**Function:** The Database. MongoDB stores data as JSON-like documents (flexible). Mongoose is the tool that lets Node.js talk to MongoDB easily.
**Where is it?** `Backend/models/` (e.g., `User.js`, `Message.js`).

### 10. JWT (JSON Web Tokens)
**Function:** The "id card" for security. When you login, the server gives you a unique encoded token. You send this token with every request to prove who you are.
**Where is it?** `Backend/controllers/authController.js` and `Frontend/src/context/AuthContext.jsx`.

### 11. Vite
**Function:** The Build Tool. It's the super-fast engine that runs the React frontend. It also handles the "Proxy" that lets the Frontend talk to the Backend securely.
**Where is it?** [`Frontend/vite.config.js`](file:///D:/react/Call-center/Frontend/vite.config.js)
