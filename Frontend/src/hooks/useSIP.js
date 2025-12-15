import { useState, useEffect, useRef, useCallback } from "react";
import { UserAgent, Registerer, Inviter, SessionState } from "sip.js";

export const useSIP = (agentName, agentPassword, asteriskIp) => {
    const [userAgent, setUserAgent] = useState(null);
    const [session, setSession] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    const [heldSession, setHeldSession] = useState(null);
    const [status, setStatus] = useState("disconnected");
    const [callStatus, setCallStatus] = useState("idle");
    const [incomingSession, setIncomingSession] = useState(null);
    const [remoteIdentity, setRemoteIdentity] = useState(null); // Persist caller/callee ID

    const audioRef = useRef(new Audio());
    const ringtoneRef = useRef(new Audio("/sounds/ringtone.mp3"));
    const ringbackRef = useRef(new Audio("/sounds/ringback.mp3"));

    useEffect(() => {
        ringtoneRef.current.loop = true;
        ringbackRef.current.loop = true;
    }, []);

    const stopRinging = useCallback(() => {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringbackRef.current.pause();
        ringbackRef.current.currentTime = 0;
    }, []);

    // Refs to access current state inside callbacks/listeners
    const sessionRef = useRef(null);
    const heldSessionRef = useRef(null);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        heldSessionRef.current = heldSession;
    }, [heldSession]);

    useEffect(() => {
        console.log("=== useSIP Debug ===");
        console.log("Agent Name:", agentName);
        console.log("Asterisk IP:", asteriskIp);

        if (!agentName || !agentPassword || !asteriskIp) {
            console.error("Missing required params - cannot connect");
            return;
        }

        // SIP Configuration
        const sipUri = `sip:${agentName}@${asteriskIp}`;
        const wssUrl = `wss://${asteriskIp}:8089/ws`;

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
                setStatus("error");
            });

        setUserAgent(ua);

        return () => {
            registerer.unregister().catch(() => { });
            ua.stop().catch(() => { });
        };
    }, [agentName, agentPassword, asteriskIp]);

    const handleIncomingCall = (invitation) => {
        if (!sessionRef.current) {
            setCallStatus("incoming");
            ringtoneRef.current.play().catch(e => console.error("Ringtone error:", e));
        }
        setIncomingSession(invitation);
        setRemoteIdentity(invitation.remoteIdentity.uri.user);

        invitation.stateChange.addListener((newState) => {
            if (newState === SessionState.Terminated) {
                // Check if this was the incoming session being rejected/cancelled
                setIncomingSession((prev) => (prev === invitation ? null : prev));

                // Only clear if it was the active call
                if (!sessionRef.current) {
                    setRemoteIdentity(null);
                    // Ensure ringing stops if the call was cancelled before answer
                    stopRinging();
                    setCallStatus("idle");
                }

                // If this was the active session, handle cleanup
                if (sessionRef.current === invitation) {
                    handleSessionTermination();
                }
            }
        });
    };

    const handleSessionTermination = () => {
        // If we have a held session, resume it
        if (heldSessionRef.current) {
            console.log("Resuming held session...");
            const held = heldSessionRef.current;

            // Unhold
            const unholdOptions = {
                sessionDescriptionHandlerOptions: {
                    hold: false
                }
            };
            held.invite(unholdOptions)
                .then(() => {
                    setSession(held);
                    setHeldSession(null);
                    setCallStatus("connected");
                    setIsOnHold(false);
                    // Re-attach media
                    setupRemoteMedia(held);
                })
                .catch(err => {
                    console.error("Failed to resume held session", err);
                    setSession(null);
                    setHeldSession(null);
                    setCallStatus("ended");
                    setRemoteIdentity(null);
                    setTimeout(() => setCallStatus("idle"), 2000);
                });
        } else {
            // No held session, full cleanup
            stopRinging();
            setCallStatus("ended");
            setSession(null);
            setIsMuted(false);
            setIsOnHold(false);
            setRemoteIdentity(null);
            setTimeout(() => setCallStatus("idle"), 2000);
        }
    };

    const answerCall = useCallback(() => {
        if (!incomingSession) return;

        // If there is an active session, hold it and swap
        if (session) {
            console.log("Holding active session to answer new call...");
            const holdOptions = {
                sessionDescriptionHandlerOptions: {
                    hold: true
                }
            };
            session.invite(holdOptions).catch(err => console.error("Auto-hold failed", err));

            setHeldSession(session);
            setIsOnHold(false); // The NEW call starts not-on-hold
        }

        // Optimistic UI update: Start timer immediately
        stopRinging();
        setCallStatus("connected");

        const options = {
            sessionDescriptionHandlerOptions: {
                constraints: { audio: true, video: false },
                iceGatheringTimeout: 200,
            },
        };

        incomingSession.accept(options)
            .then(() => {
                setSession(incomingSession);
                // Status already set optimistically, but confirm it
                setCallStatus("connected");
                setupRemoteMedia(incomingSession);
            })
            .catch((err) => {
                console.error("Answer error:", err);
                // Revert status on error
                setCallStatus("incoming");
            });
    }, [incomingSession, session]);

    const makeCall = useCallback((target) => {
        if (!userAgent) return;

        const targetURI = UserAgent.makeURI(`sip:${target}@${asteriskIp}`);
        if (!targetURI) {
            console.error("Invalid target URI");
            return;
        }

        const inviter = new Inviter(userAgent, targetURI, {
            delegate: {
                onAccept: () => {
                    // Fastest possible trigger for "Connected"
                    stopRinging();
                    setCallStatus("connected");
                    setupRemoteMedia(inviter);
                },
            }
        });

        setRemoteIdentity(target);

        inviter.stateChange.addListener((newState) => {
            switch (newState) {
                case SessionState.Establishing:
                    setCallStatus("calling");
                    ringbackRef.current.play().catch(e => console.error("Ringback error:", e));
                    break;
                case SessionState.Established:
                    stopRinging();
                    // Fallback if onAccept didn't fire (rare)
                    if (callStatus !== "connected") {
                        setCallStatus("connected");
                        setupRemoteMedia(inviter);
                    }
                    break;
                case SessionState.Terminated:
                    stopRinging();
                    if (sessionRef.current === inviter) {
                        handleSessionTermination();
                    }
                    break;
                default:
                    break;
            }
        });

        inviter.invite({
            sessionDescriptionHandlerOptions: {
                constraints: { audio: true, video: false },
                iceGatheringTimeout: 200,
            },
        })
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
        stopRinging();
        setSession(null);
        setIncomingSession(null);
        setCallStatus("idle");
        setIsMuted(false);
        setIsOnHold(false);
        setRemoteIdentity(null);
    }, [session, incomingSession]);

    const toggleMute = useCallback(() => {
        if (!session) return;

        const pc = session.sessionDescriptionHandler?.peerConnection;
        if (!pc) return;

        pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
                sender.track.enabled = !sender.track.enabled;
            }
        });

        setIsMuted(prev => !prev);
    }, [session]);

    const toggleHold = useCallback(() => {
        if (!session || session.state !== SessionState.Established) return;

        const holdOptions = {
            sessionDescriptionHandlerOptions: {
                hold: !isOnHold
            }
        };

        session.invite(holdOptions)
            .then(() => {
                setIsOnHold(prev => !prev);
            })
            .catch((err) => console.error("Hold error:", err));
    }, [session, isOnHold]);

    const sendDTMF = useCallback((tone) => {
        if (session && session.state === SessionState.Established) {
            session.dtmf(tone);
        }
    }, [session]);

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

    const signalConnected = useCallback(() => {
        console.log("⚡ Signal Connected triggered!");
        setCallStatus("connected");
    }, []);

    const swapCalls = useCallback(() => {
        if (!session || !heldSessionRef.current) return;

        console.log("Swapping calls...");
        const currentActive = session;
        const currentHeld = heldSessionRef.current;

        // 1. Hold the current active call
        const holdOptions = { sessionDescriptionHandlerOptions: { hold: true } };
        currentActive.invite(holdOptions)
            .then(() => {
                // 2. Unhold the previously held call
                const unholdOptions = { sessionDescriptionHandlerOptions: { hold: false } };
                return currentHeld.invite(unholdOptions);
            })
            .then(() => {
                // 3. Swap state
                setSession(currentHeld);
                setHeldSession(currentActive);
                setRemoteIdentity(currentHeld.remoteIdentity?.uri?.user);
                setIsOnHold(false);
                setupRemoteMedia(currentHeld);
            })
            .catch(err => console.error("Swap failed:", err));
    }, [session]);

    return {
        status,
        callStatus,
        makeCall,
        answerCall,
        hangup,
        incomingSession,
        remoteIdentity,
        toggleMute,
        isMuted,
        toggleHold,
        isOnHold,
        sendDTMF,
        signalConnected,
        heldSession,
        swapCalls
    };
};
