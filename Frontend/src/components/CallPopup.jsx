import { PhoneIncoming, PhoneOff, User } from "lucide-react";

export default function CallPopup({ caller, onAccept, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="glass-card p-8 max-w-sm w-full mx-4 text-center animate-slide-up">
        {/* Ring animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-accent-green/20 rounded-full animate-ping" />
          <div className="absolute inset-2 bg-accent-green/30 rounded-full animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent-green to-accent-blue rounded-full flex items-center justify-center animate-ring">
            <PhoneIncoming className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Caller info */}
        <h2 className="text-xl font-bold text-white mb-2">Incoming Call</h2>
        <div className="flex items-center justify-center gap-2 text-gray-400 mb-8">
          <User className="w-4 h-4" />
          <span>{caller}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-accent-red/20 text-accent-red border border-accent-red/30 rounded-xl hover:bg-accent-red/30 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="font-semibold">Decline</span>
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-accent-green text-white rounded-xl hover:bg-accent-green/90 transition-all shadow-lg"
          >
            <PhoneIncoming className="w-5 h-5" />
            <span className="font-semibold">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
