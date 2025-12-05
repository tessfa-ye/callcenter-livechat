import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export default function useSessionTimeout() {
    const navigate = useNavigate();

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        navigate("/login");
    }, [navigate]);

    useEffect(() => {
        let timeoutId;
        let lastActivity = Date.now();

        const resetTimer = () => {
            lastActivity = Date.now();
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const timeSinceLastActivity = Date.now() - lastActivity;
                if (timeSinceLastActivity >= SESSION_TIMEOUT) {
                    alert("Session expired. Please login again.");
                    logout();
                }
            }, SESSION_TIMEOUT);
        };

        // Events to track user activity
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        events.forEach((event) => {
            document.addEventListener(event, resetTimer);
        });

        // Initial timer
        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach((event) => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [logout]);
}
