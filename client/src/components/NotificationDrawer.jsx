// client/src/components/NotificationDrawer.jsx - Real-time notification drawer (TASK-020)
import React from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Clock, 
  Truck, 
  ShieldAlert, 
  PackageCheck,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  onRefresh,
  currentRole
}) {
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead(currentRole);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.warn("Failed to mark notifications read", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-industrial-950/70 backdrop-blur-sm select-none animate-fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l-4 border-industrial-800 animate-slide-in">
        {/* Header */}
        <div className="bg-industrial-900 text-white px-5 py-4 flex items-center justify-between border-b border-industrial-700">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-5 h-5 text-safety-green" />
            <div>
              <h2 className="text-base font-black tracking-wide">Operational Notifications</h2>
              <p className="text-[11px] font-mono text-industrial-300">Targeted Alerts for {currentRole}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-industrial-800 hover:bg-industrial-700 rounded-full text-industrial-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-industrial-100 border-b border-industrial-200 flex items-center justify-between text-xs">
          <span className="font-bold text-industrial-600">
            {notifications.length} Alerts Broadcasted
          </span>
          <button
            onClick={handleMarkAllRead}
            className="text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-industrial-400 font-bold">
              No recent notifications for your role.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border transition space-y-1 ${
                  !n.read
                    ? "bg-blue-50/70 border-blue-300 shadow-sm"
                    : "bg-industrial-50 border-industrial-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-industrial-200 text-industrial-800">
                    {n.targetRole}
                  </span>
                  <span className="text-[10px] font-mono text-industrial-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                  </span>
                </div>

                <div className="text-xs font-black text-industrial-900 mt-1">{n.title}</div>
                <div className="text-xs text-industrial-700">{n.message}</div>
                {n.deliveryId && (
                  <div className="text-[10px] font-mono text-blue-700 font-bold pt-1">
                    Ref: {n.deliveryId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-industrial-50 border-t border-industrial-200 text-center">
          <button
            onClick={onClose}
            className="btn-touch w-full bg-industrial-900 hover:bg-industrial-800 text-white rounded-xl font-bold text-xs"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
