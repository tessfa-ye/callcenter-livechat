# API Documentation

This document maps the application's API endpoints to their source code locations.

## Base URL
All API routes are prefixed with `/api`.
Example: `http://localhost:5000/api/auth/login`

---

## 🔐 Authentication & User Status
**File:** [Backend/routes/authRoutes.js](file:///D:/react/Call-center/Backend/routes/authRoutes.js)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticates a user and returns a JWT token. |
| `PUT` | `/auth/status` | Updates the current user's status (e.g., "available", "busy"). |
| `GET` | `/auth/agents` | Lists all agents with their current status (used for messaging lists). |

---

## 👮 Admin Management
**File:** [Backend/routes/adminRoutes.js](file:///D:/react/Call-center/Backend/routes/adminRoutes.js)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/stats` | Returns high-level dashboard stats (total agents, active calls, etc.). |
| `GET` | `/admin/agents-online` | Returns a detailed list of currently online agents. |
| `GET` | `/admin/system-status` | Checks server, DB, Asterisk, and Socket health. |
| `GET` | `/admin/agents` | Lists all registered agents (for management table). |
| `POST` | `/admin/agents` | Creates a new agent (also creates Asterisk extension via SSH). |
| `PUT` | `/admin/agents/:id` | Updates an agent's details (email, extension, etc.). |
| `DELETE` | `/admin/agents/:id` | Deletes an agent. |

---

## 📞 Call Management
**File:** [Backend/routes/callRoutes.js](file:///D:/react/Call-center/Backend/routes/callRoutes.js)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/calls/stats` | Returns specific call statistics (active calls today, resolved, etc.). |
| `GET` | `/calls/recent` | Returns a list of the most recent calls for the dashboard. |
| `POST` | `/calls` | Webhook used by Asterisk (AMI) to log new calls. |

---

## 💬 Messaging
**File:** [Backend/routes/messageRoutes.js](file:///D:/react/Call-center/Backend/routes/messageRoutes.js)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/messages` | Sends and saves a new message. |
| `GET` | `/messages/conversations/:agentId` | Gets unique conversations for an agent. |
| `GET` | `/messages/:agentId/:partnerId` | Gets chat history between two users. |
| `PUT` | `/messages/:id` | Edits an existing message. |
| `DELETE` | `/messages/:id` | Deletes a message. |

---

## ⚙️ Settings
**File:** [Backend/routes/settingsRoutes.js](file:///D:/react/Call-center/Backend/routes/settingsRoutes.js)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/settings` | Retrieves global application settings. |
| `PUT` | `/settings/:category` | Updates a specific category of settings (Admin only). |
