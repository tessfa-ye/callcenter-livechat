import React, { useState, useEffect } from "react";
import { Phone, PhoneOff, Delete, Mic, MicOff, Grid, User } from "lucide-react";

export default function Dialpad({ isOpen, onClose, onCall, activeCallStatus, toggleMute, isMuted, sendDTMF, callerId, toggleHold, isOnHold, adminSettings = {}, heldCall, onSwap }) {
  const [number, setNumber] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval;
    if (activeCallStatus === "connected") {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
      setShowKeypad(false);
    }
    return () => clearInterval(interval);
  }, [activeCallStatus]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    setNumber((prev) => prev + digit);
    if (activeCallStatus === "connected" && sendDTMF) {
        sendDTMF(digit);
    }
  };

  const handleDelete = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (number) onCall(number);
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  // Render In-Call UI
  if (activeCallStatus !== "idle" && activeCallStatus !== "ended" && !showKeypad) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-dark-800 p-8 rounded-3xl border border-white/10 w-80 shadow-2xl flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-purple rounded-full flex items-center justify-center mb-4 shadow-lg shadow-accent-purple/20">
                    <User size={40} className="text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-1">{callerId || number || "Unknown"}</h2>
                
                <p className={`text-sm font-medium mb-8 ${
                    activeCallStatus === "connected" ? "text-accent-green" : "text-gray-400 animate-pulse"
                }`}>
                    {activeCallStatus === "connected" ? formatTime(duration) : activeCallStatus === "incoming" ? "Incoming Call..." : "Calling..."}
                </p>

                {/* Held Call Indicator */}
                {heldCall && (
                    <div className="mb-6 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center gap-3 w-full">
                         <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                         <div className="flex-1 text-left">
                            <p className="text-yellow-500 text-xs font-bold uppercase">On Hold</p>
                            <p className="text-white text-sm">{heldCall.remoteIdentity?.uri?.user || "Unknown"}</p>
                         </div>
                         <button 
                            onClick={onSwap}
                            className="px-3 py-1 bg-yellow-500 text-black font-bold text-xs rounded-lg hover:bg-yellow-400 transition-colors"
                         >
                            Swap
                         </button>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-6 w-full mb-8">
                    <button 
                        onClick={toggleMute}
                        className={`flex flex-col items-center gap-2 ${isMuted ? "text-white" : "text-gray-400 hover:text-white"}`}
                    >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                            isMuted ? "bg-white text-dark-800" : "bg-dark-700"
                        }`}>
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </div>
                        <span className="text-xs">Mute</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowKeypad(true)}
                        className="flex flex-col items-center gap-2 text-gray-400 hover:text-white"
                    >
                        <div className="w-14 h-14 rounded-full bg-dark-700 flex items-center justify-center transition-all">
                            <Grid size={24} />
                        </div>
                        <span className="text-xs">Keypad</span>
                    </button>

                     <button 
                        onClick={toggleHold}
                        disabled={!adminSettings?.calls?.enableHold}
                        className={`flex flex-col items-center gap-2 ${
                          !adminSettings?.calls?.enableHold ? "opacity-50 cursor-not-allowed" :
                          isOnHold ? "text-white" : "text-gray-400 hover:text-white"
                        }`}
                     >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                            isOnHold ? "bg-white text-dark-800" : "bg-dark-700"
                        }`}>
                            <Phone size={24} className={isOnHold ? "fill-current" : ""} />
                        </div>
                        <span className="text-xs">{isOnHold ? "Resume" : "Hold"}</span>
                    </button>
                </div>

                <button
                    onClick={() => onCall(null)}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
                >
                    <PhoneOff size={32} />
                </button>
            </div>
        </div>
    );
  }

  // Render Dialer / Keypad UI
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 p-6 rounded-3xl border border-white/10 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {activeCallStatus !== "idle" ? "Keypad" : "Phone"}
          </h2>
          <button 
            onClick={activeCallStatus !== "idle" ? () => setShowKeypad(false) : onClose} 
            className="text-gray-400 hover:text-white p-2"
           >
            {activeCallStatus !== "idle" ? "Back" : "✕"}
          </button>
        </div>

        {/* Display */}
        <div className="bg-dark-900/50 p-4 rounded-xl mb-6 flex justify-between items-center h-20 border border-white/5">
          <span className="text-3xl text-white font-light tracking-wider overflow-hidden text-ellipsis whitespace-nowrap">
            {number}
            {activeCallStatus !== "idle" && <span className="animate-pulse">|</span>}
          </span>
          {number && (
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-400 transition-colors pl-2">
              <Delete size={24} />
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {digits.map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="w-16 h-16 rounded-full bg-dark-700 hover:bg-dark-600 active:bg-dark-500 text-white text-2xl font-light transition-all flex items-center justify-center mx-auto"
            >
              {digit}
            </button>
          ))}
        </div>

        {/* Actions - Only show Dial button if NOT in a call (otherwise it's just a keypad) */}
        {activeCallStatus === "idle" || activeCallStatus === "ended" ? (
            <div className="flex justify-center">
                <button
                onClick={handleCall}
                disabled={!number}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                    number
                    ? "bg-accent-green hover:bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "bg-dark-700 text-gray-600 cursor-not-allowed"
                }`}
                >
                <Phone size={28} fill="currentColor" />
                </button>
            </div>
        ) : (
             <div className="flex justify-center pb-2">
                <button
                    onClick={() => setShowKeypad(false)}
                    className="text-sm text-gray-400 hover:text-white"
                >
                    Hide Keypad
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
