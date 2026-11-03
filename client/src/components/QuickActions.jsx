// client/src/components/QuickActions.jsx - Glove-friendly 48px+ quick action buttons
import React from 'react';
import { 
  Scan, 
  Navigation2, 
  Package, 
  AlertOctagon, 
  ShieldCheck, 
  CheckSquare, 
  QrCode, 
  FileText
} from 'lucide-react';

export default function QuickActions({
  currentRole,
  onOpenScanner,
  onNavigate,
  onViewDelivery,
  onOpenExceptions,
  onQuickAction
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-industrial-500">
          Quick Operational Actions (Glove-Friendly)
        </h3>
        <span className="text-[11px] font-mono text-industrial-400">Min 48px Touch Area</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. SCAN */}
        <button
          onClick={() => onOpenScanner()}
          className="btn-touch flex-col py-3 px-2 bg-industrial-900 hover:bg-industrial-800 text-white rounded-xl shadow-sm border-2 border-industrial-950 transition active:scale-95 group"
        >
          <Scan className="w-6 h-6 text-safety-green mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black tracking-wider">SCAN</span>
          <span className="text-[10px] text-industrial-300">QR / Barcode</span>
        </button>

        {/* 2. NAVIGATE */}
        <button
          onClick={onNavigate}
          className="btn-touch flex-col py-3 px-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-sm border-2 border-blue-900 transition active:scale-95 group"
        >
          <Navigation2 className="w-6 h-6 text-white mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black tracking-wider">NAVIGATE</span>
          <span className="text-[10px] text-blue-200">To Assigned Bay</span>
        </button>

        {/* 3. MY DELIVERY */}
        <button
          onClick={onViewDelivery}
          className="btn-touch flex-col py-3 px-2 bg-industrial-100 hover:bg-industrial-200 text-industrial-900 rounded-xl shadow-sm border-2 border-industrial-300 transition active:scale-95 group"
        >
          <Package className="w-6 h-6 text-industrial-700 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black tracking-wider">MY DELIVERY</span>
          <span className="text-[10px] text-industrial-500">Manifest & Specs</span>
        </button>

        {/* 4. EXCEPTIONS */}
        <button
          onClick={onOpenExceptions}
          className="btn-touch flex-col py-3 px-2 bg-red-50 hover:bg-red-100 text-safety-red rounded-xl shadow-sm border-2 border-red-200 hover:border-red-400 transition active:scale-95 group"
        >
          <AlertOctagon className="w-6 h-6 text-safety-red mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black tracking-wider">EXCEPTIONS</span>
          <span className="text-[10px] text-red-600">Damage / Discrepancy</span>
        </button>
      </div>

      {/* Role Context Bar */}
      <div className="mt-3 pt-3 border-t border-industrial-100 flex flex-wrap items-center justify-between text-xs text-industrial-600 gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-industrial-900">{currentRole} Shortcut:</span>
          {currentRole === "Security Guard" && (
            <button
              onClick={() => onQuickAction("VERIFY_GATE")}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-bold border border-amber-300 flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Inbound Vehicle QR</span>
            </button>
          )}
          {currentRole === "Storekeeper" && (
            <button
              onClick={() => onQuickAction("PUTAWAY_GUIDANCE")}
              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-md font-bold border border-emerald-300 flex items-center space-x-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Recommended Put-Away (Rack A-14)</span>
            </button>
          )}
          {currentRole === "Driver" && (
            <button
              onClick={() => onQuickAction("DRIVER_POD")}
              className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-md font-bold border border-blue-300 flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Capture Proof of Delivery (POD)</span>
            </button>
          )}
          {currentRole === "Admin" && (
            <button
              onClick={() => onQuickAction("AUDIT_LOGS")}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-md font-bold border border-purple-300 flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Log Trail</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
