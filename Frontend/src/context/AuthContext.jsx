import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("agent");
    if (saved) setAgent(JSON.parse(saved));
  }, []);

  return (
    <AuthContext.Provider value={{ agent, setAgent }}>
      {children}
    </AuthContext.Provider>
  );
}
