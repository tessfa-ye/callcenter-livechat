import React, { useState } from "react";
import { Phone, PhoneOff, Delete } from "lucide-react";

export default function Dialpad({ isOpen, onClose, onCall, activeCallStatus }) {
  const [number, setNumber] = useState("");

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    setNumber((prev) => prev + digit);
  };

  const handleDelete = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (number) onCall(number);
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 p-6 rounded-2xl border border-white/10 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Phone</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Display */}
        <div className="bg-dark-900 p-4 rounded-xl mb-6 flex justify-between items-center h-16">
          <span className="text-2xl text-white tracking-widest">{number}</span>
          {number && (
            <button onClick={handleDelete} className="text-gray-400 hover:text-white">
              <Delete size={20} />
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {digits.map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="w-16 h-16 rounded-full bg-dark-700 hover:bg-dark-600 text-white text-xl font-medium transition-all flex items-center justify-center mx-auto"
            >
              {digit}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          {activeCallStatus === "idle" || activeCallStatus === "ended" ? (
            <button
              onClick={handleCall}
              disabled={!number}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                number
                  ? "bg-accent-green hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
                  : "bg-dark-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Phone size={24} fill="currentColor" />
            </button>
          ) : (
             <button
              onClick={() => onCall(null)} // Hangup
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20"
            >
              <PhoneOff size={24} />
            </button>
          )}
        </div>
        
        {activeCallStatus !== "idle" && (
           <div className="text-center mt-4 text-accent-green font-medium animate-pulse">
             {activeCallStatus.toUpperCase()}
           </div>
        )}
      </div>
    </div>
  );
}
