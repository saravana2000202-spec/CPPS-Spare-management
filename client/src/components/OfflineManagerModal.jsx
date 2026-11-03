// client/src/components/OfflineManagerModal.jsx - Offline cache inspector and manual sync engine (TASK-024, TASK-025, TASK-026)
import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  X, 
  CheckCircle2, 
  Layers, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { offlineMgr, sound } from '../api';

export default function OfflineManagerModal({
  isOpen,
  onClose,
  offlineStatus,
  onToggleOffline
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await offlineMgr.syncNow();
      setSyncMessage(`Successfully synchronized ${res.synced} transactions to Central WMS.`);
    } catch (e) {
      setSyncMessage(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/80 backdrop-blur-sm select-none animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-4 border-industrial-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-industrial-900 text-white px-5 py-4 flex items-center justify-between border-b-2 border-industrial-700">
          <div className="flex items-center space-x-2.5">
            <HardDrive className="w-6 h-6 text-safety-cyan" />
            <div>
              <h2 className="text-base font-black tracking-wide">Offline Engine & Local Queue</h2>
              <p className="text-[11px] font-mono text-industrial-300">
                TASK-024 to TASK-026: Store-and-Forward Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-industrial-800 hover:bg-industrial-700 rounded-full text-industrial-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Connection Status Box */}
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
            offlineStatus.isOffline
              ? "bg-amber-50 border-amber-400 text-amber-950"
              : "bg-emerald-50 border-emerald-400 text-emerald-950"
          }`}>
            <div className="flex items-center space-x-3">
              {offlineStatus.isOffline ? (
                <WifiOff className="w-8 h-8 text-amber-600" />
              ) : (
                <Wifi className="w-8 h-8 text-emerald-600" />
              )}
              <div>
                <div className="font-black text-sm">
                  {offlineStatus.isOffline ? "Operating in OFFLINE Mode" : "Operating in LIVE ONLINE Mode"}
                </div>
                <div className="text-xs opacity-90">
                  {offlineStatus.isOffline
                    ? "Scans are queued in local memory and will auto-sync upon reconnection."
                    : "Direct real-time link to plant backend and ERP/WMS."}
                </div>
              </div>
            </div>

            <button
              onClick={onToggleOffline}
              className={`btn-touch px-3 py-1.5 rounded-xl font-bold text-xs border ${
                offlineStatus.isOffline
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-900"
                  : "bg-amber-600 hover:bg-amber-700 text-white border-amber-800"
              }`}
            >
              {offlineStatus.isOffline ? "Go Online" : "Simulate Offline"}
            </button>
          </div>

          {/* Sync Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-industrial-50 p-3 rounded-xl border border-industrial-200">
              <span className="text-industrial-500 font-bold block uppercase text-[10px]">Locally Queued Scans</span>
              <span className="text-2xl font-black text-industrial-900">{offlineStatus.pendingCount}</span>
              <div className="text-industrial-600 text-[11px] mt-0.5">Pending transmission</div>
            </div>

            <div className="bg-industrial-50 p-3 rounded-xl border border-industrial-200">
              <span className="text-industrial-500 font-bold block uppercase text-[10px]">Local Master Data</span>
              <span className="text-2xl font-black text-safety-green">Cached</span>
              <div className="text-industrial-600 text-[11px] mt-0.5">Routes & locations valid</div>
            </div>
          </div>

          {/* Queue Inspection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-industrial-600">
                Pending Local Transactions Queue:
              </span>
              <button
                onClick={handleManualSync}
                disabled={isSyncing || offlineStatus.pendingCount === 0 || offlineStatus.isOffline}
                className="btn-touch px-3 py-1 bg-industrial-900 hover:bg-industrial-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Flush & Sync Now"}</span>
              </button>
            </div>

            {syncMessage && (
              <div className="p-3 mb-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
                {syncMessage}
              </div>
            )}

            {offlineStatus.queue.length === 0 ? (
              <div className="p-6 bg-industrial-50 border border-dashed border-industrial-300 rounded-xl text-center text-xs text-industrial-500 font-medium">
                No transactions waiting in offline queue. All records are in sync.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {offlineStatus.queue.map((item) => (
                  <div key={item.id} className="p-2.5 bg-industrial-50 border border-industrial-200 rounded-xl text-xs flex items-center justify-between font-mono">
                    <div>
                      <span className="font-bold text-industrial-900">{item.type}</span>
                      <div className="text-[11px] text-industrial-500">Ref: {item.deliveryId}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                      QUEUE PENDING
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-industrial-50 border-t border-industrial-200 flex justify-end">
          <button
            onClick={onClose}
            className="btn-touch px-5 py-2 bg-industrial-900 hover:bg-industrial-800 text-white rounded-xl font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
