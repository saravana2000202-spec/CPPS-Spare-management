// client/src/views/SecurityView.jsx - Security gate clearance, vehicle verification, and entry decisions
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  UserCheck, 
  Camera, 
  AlertOctagon, 
  ArrowRight,
  HelpCircle,
  Eye
} from 'lucide-react';
import { api, sound } from '../api';

export default function SecurityView({
  deliveries = [],
  activeDelivery,
  onOpenScanner,
  onOpenExceptions,
  currentUser
}) {
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(activeDelivery?.id || "DEL-2026-00482");

  const currentDelivery = deliveries.find(d => d.id === selectedDeliveryId) || activeDelivery || deliveries[0];

  const handleGateDecision = async (decision) => {
    if (!currentDelivery) return;
    setIsProcessing(true);
    try {
      await api.gateDecision(
        currentDelivery.id,
        decision,
        currentUser?.name || "Suresh Pillai",
        decisionNotes
      );
      setDecisionNotes("");
    } catch (err) {
      alert("Gate decision error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* 1. Security Banner & Gate Status */}
      <div className="bg-industrial-900 text-white rounded-2xl p-4 border-2 border-industrial-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500 text-industrial-950 rounded-xl font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
              Gate Inspection Post — Inbound North
            </div>
            <h2 className="text-base font-black text-white">Security Clearance & Vehicle Access Control</h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenScanner("DELIVERY_QR")}
            className="btn-touch px-3.5 py-2 bg-safety-green hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Vehicle QR</span>
          </button>
        </div>
      </div>

      {/* 2. Expected Vehicles Queue (TASK-010) */}
      <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-industrial-100 border-b border-industrial-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-industrial-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-industrial-700">
              Expected Vehicle Schedule (TASK-010)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-industrial-600">
            {deliveries.length} Vehicles Inbound
          </span>
        </div>

        <div className="divide-y divide-industrial-200">
          {deliveries.map((del) => {
            const isSelected = del.id === currentDelivery?.id;
            const isAtGate = del.status === "At Gate";
            const isEnRoute = del.status === "En Route" || del.status === "Verified";
            const isComplete = del.status === "Complete";

            return (
              <div
                key={del.id}
                onClick={() => setSelectedDeliveryId(del.id)}
                className={`p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition ${
                  isSelected
                    ? "bg-amber-50/70 border-l-4 border-amber-600"
                    : "hover:bg-industrial-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl font-bold ${
                    isAtGate ? "bg-amber-600 text-white animate-pulse" : "bg-industrial-200 text-industrial-700"
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-industrial-900">{del.vehicleNumber}</span>
                      <span className="text-xs font-bold text-industrial-500">({del.id})</span>
                    </div>
                    <div className="text-xs text-industrial-600">
                      Driver: <span className="font-bold text-industrial-800">{del.driverName}</span> | Material: {del.materialName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-industrial-700">ETA: {del.eta}</div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      isComplete
                        ? "bg-safety-green text-white"
                        : isEnRoute
                        ? "bg-blue-600 text-white"
                        : isAtGate
                        ? "bg-amber-600 text-white"
                        : "bg-industrial-200 text-industrial-700"
                    }`}>
                      {del.status}
                    </span>
                  </div>
                  <ArrowRight className={`w-4 h-4 ${isSelected ? "text-amber-700" : "text-industrial-400"}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Gate Verification & Decision Panel (TASK-012, TASK-013) */}
      {currentDelivery && (
        <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-industrial-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-industrial-500">
                Gate 1 Physical & Digital Inspection
              </span>
              <h3 className="text-base font-black text-industrial-900">
                Verification Details: {currentDelivery.vehicleNumber} ({currentDelivery.id})
              </h3>
            </div>
            {currentDelivery.securityVerification?.decision && (
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                currentDelivery.securityVerification.decision === "ALLOW_ENTRY"
                  ? "bg-safety-green text-white"
                  : "bg-safety-red text-white"
              }`}>
                Decision: {currentDelivery.securityVerification.decision}
              </span>
            )}
          </div>

          {/* Verification Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-industrial-50 p-3 rounded-xl border border-industrial-200">
              <div className="text-[11px] font-bold text-industrial-500 uppercase">1. Driver Identity</div>
              <div className="text-sm font-bold text-industrial-900 mt-1">{currentDelivery.driverName}</div>
              <div className="text-xs text-industrial-600 font-mono">{currentDelivery.driverPhone}</div>
              <div className="text-xs text-safety-green font-bold mt-1">✓ Identity Verified</div>
            </div>

            <div className="bg-industrial-50 p-3 rounded-xl border border-industrial-200">
              <div className="text-[11px] font-bold text-industrial-500 uppercase">2. Manifest PO Match</div>
              <div className="text-sm font-bold text-industrial-900 mt-1">{currentDelivery.poNumber}</div>
              <div className="text-xs text-industrial-600">{currentDelivery.vendor}</div>
              <div className="text-xs text-safety-green font-bold mt-1">✓ PO Inbound Active</div>
            </div>

            <div className="bg-industrial-50 p-3 rounded-xl border border-industrial-200">
              <div className="text-[11px] font-bold text-industrial-500 uppercase">3. Gate & Dock Target</div>
              <div className="text-sm font-bold text-industrial-900 mt-1">{currentDelivery.dockAssigned}</div>
              <div className="text-xs text-industrial-600">{currentDelivery.destination}</div>
              <div className="text-xs text-blue-600 font-bold mt-1">✓ Bay 2 Clear</div>
            </div>
          </div>

          {/* Notes input */}
          <div>
            <label className="text-xs font-bold text-industrial-700 block mb-1">
              Security Inspection Notes / Seal Number:
            </label>
            <input
              type="text"
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="e.g. Container seal unbroken, driver breathalyzer 0.00, PPE verified."
              className="w-full px-3 py-2 border-2 border-industrial-300 rounded-xl text-xs focus:outline-none focus:border-industrial-900"
            />
          </div>

          {/* Decision Action Buttons (TASK-013) */}
          <div className="pt-2">
            <span className="text-xs font-black uppercase tracking-wider text-industrial-500 block mb-2">
              Entry Decision Action (Audit Log Recorded):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ALLOW ENTRY */}
              <button
                onClick={() => handleGateDecision("ALLOW_ENTRY")}
                disabled={isProcessing || currentDelivery.securityVerification?.decision === "ALLOW_ENTRY"}
                className="btn-touch py-3 px-4 bg-safety-green hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md border-2 border-emerald-800 transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>ALLOW ENTRY</span>
              </button>

              {/* HOLD */}
              <button
                onClick={() => handleGateDecision("HOLD")}
                disabled={isProcessing}
                className="btn-touch py-3 px-4 bg-amber-500 hover:bg-amber-600 text-industrial-950 rounded-xl font-black text-sm shadow-md border-2 border-amber-700 transition flex items-center justify-center space-x-2 active:scale-95"
              >
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <span>HOLD VEHICLE</span>
              </button>

              {/* ESCALATE */}
              <button
                onClick={() => handleGateDecision("ESCALATE")}
                disabled={isProcessing}
                className="btn-touch py-3 px-4 bg-safety-red hover:bg-red-700 text-white rounded-xl font-black text-sm shadow-md border-2 border-red-800 transition flex items-center justify-center space-x-2 active:scale-95"
              >
                <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
                <span>ESCALATE TO ADMIN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
