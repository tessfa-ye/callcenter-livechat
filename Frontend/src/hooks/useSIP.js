import { useState, useEffect, useRef, useCallback } from "react";
import { UserAgent, Registerer, Inviter, SessionState } from "sip.js";

export const useSIP = (agentName, agentPassword, asteriskIp) => {
    const [userAgent, setUserAgent] = useState(null);
    const [session, setSession] = useState(null);
    const [status, setStatus] = useState("disconnected"); // disconnected, registering, registered, error
    const [callStatus, setCallStatus] = useState("idle"); // idle, calling, incoming, connected, ended
    const [incomingSession, setIncomingSession] = useState(null);

    const audioRef = useRef(new Audio());

    useEffect(() => {
        console.log("=== useSIP Debug ===");
        console.log("Agent Name:", agentName);
        console.log("Agent Password:", agentPassword ? "****" : "MISSING");
        console.log("Asterisk IP:", asteriskIp);

        if (!agentName || !agentPassword || !asteriskIp) {
            console.error("Missing required params - cannot connect");
            return;
        }

        // SIP Configuration
        const sipUri = `sip:${agentName}@${asteriskIp}`;
        const wssUrl = `wss://${asteriskIp}:8089/ws`;

        console.log("SIP URI:", sipUri);
        console.log("WSS URL:", wssUrl);

        const uri = UserAgent.makeURI(sipUri);
        if (!uri) {
            console.error("Invalid SIP URI");
            setStatus("error");
            return;
        }

        const transportOptions = {
            server: wssUrl,
        };

        const ua = new UserAgent({
            uri,
            transportOptions,
            authorizationUsername: agentName,
            authorizationPassword: agentPassword,
            delegate: {
                onInvite: (invitation) => {
                    handleIncomingCall(invitation);
                },
                onMessage: (message) => {
                    // Handle incoming SIP MESSAGE
                    const from = message.request.from.uri.user;
                    const body = message.request.body;
                    console.log(`SIP MESSAGE received from ${from}: ${body}`);

                    // Dispatch event for the app to handle
                    window.dispatchEvent(new CustomEvent("sipMessage", {
                        detail: { from, message: body, timestamp: new Date() }
                    }));

                    // Accept the message
                    message.accept();
                },
            },
            logLevel: "debug", // Enable SIP.js debug logs
        });

        const registerer = new Registerer(ua);

        console.log("Starting UserAgent...");

        ua.start()
            .then(() => {
                console.log("UserAgent started, registering...");
                setStatus("registering");
                return registerer.register();
            })
            .then(() => {
                setStatus("registered");
                console.log("✅ SIP Registered successfully!");
            })
            .catch((err) => {
                console.error("❌ SIP Connection Error:", err.message);
                console.error("Full error:", err);
                setStatus("error");
            });

        setUserAgent(ua);

        return () => {
            registerer.unregister().catch(() => { });
            ua.stop().catch(() => { });
        };
    }, [agentName, agentPassword, asteriskIp]);

    const handleIncomingCall = (invitation) => {
        setCallStatus("incoming");
        setIncomingSession(invitation);

        invitation.stateChange.addListener((newState) => {
            if (newState === SessionState.Terminated) {
                setCallStatus("ended");
                setIncomingSession(null);
                setTimeout(() => setCallStatus("idle"), 2000);
            }
        });
    };

    const answerCall = useCallback(() => {
        if (!incomingSession) return;

        incomingSession.accept()
            .then(() => {
                setSession(incomingSession);
                setCallStatus("connected");
                setupRemoteMedia(incomingSession);
            })
            .catch((err) => console.error("Answer error:", err));
    }, [incomingSession]);

    const makeCall = useCallback((target) => {
        if (!userAgent) return;

        const targetURI = UserAgent.makeURI(`sip:${target}@${asteriskIp}`);
        if (!targetURI) {
            console.error("Invalid target URI");
            return;
        }

        const inviter = new Inviter(userAgent, targetURI);

        inviter.stateChange.addListener((newState) => {
            switch (newState) {
                case SessionState.Establishing:
                    setCallStatus("calling");
                    break;
                case SessionState.Established:
                    setCallStatus("connected");
                    setupRemoteMedia(inviter);
                    break;
                case SessionState.Terminated:
                    setCallStatus("ended");
                    setSession(null);
                    setTimeout(() => setCallStatus("idle"), 2000);
                    break;
                default:
                    break;
            }
        });

        inviter.invite()
            .catch((err) => console.error("Invite error:", err));
        setSession(inviter);
    }, [userAgent, asteriskIp]);

    const hangup = useCallback(() => {
        if (session) {
            if (session.state === SessionState.Established) {
                session.bye();
            } else if (session.state === SessionState.Establishing) {
                session.cancel();
            }
        }
        if (incomingSession && incomingSession.state !== SessionState.Terminated) {
            incomingSession.reject();
        }
        setSession(null);
        setIncomingSession(null);
        setCallStatus("idle");
    }, [session, incomingSession]);

    const setupRemoteMedia = (activeSession) => {
        const pc = activeSession.sessionDescriptionHandler?.peerConnection;
        if (!pc) return;

        pc.getReceivers().forEach((receiver) => {
            if (receiver.track && receiver.track.kind === "audio") {
                const stream = new MediaStream([receiver.track]);
                audioRef.current.srcObject = stream;
                audioRef.current.play().catch((err) => console.error("Audio play error:", err));
            }
        });
    };

    return {
        status,
        callStatus,
        makeCall,
        answerCall,
        hangup,
        incomingSession
    };
};
