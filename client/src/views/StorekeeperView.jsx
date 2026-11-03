// client/src/views/StorekeeperView.jsx - Storekeeper inbound receiving, material verification, and put-away
import React, { useState } from 'react';
import { 
  PackageCheck, 
  Barcode, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Truck, 
  Layers, 
  Warehouse, 
  ArrowRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { api, sound } from '../api';

export default function StorekeeperView({
  deliveries = [],
  activeDelivery,
  onOpenScanner,
  onOpenExceptions,
  currentUser
}) {
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(activeDelivery?.id || "DEL-2026-00482");
  const currentDelivery = deliveries.find(d => d.id === selectedDeliveryId) || activeDelivery || deliveries[0];

  const isMaterialVerified = currentDelivery?.materialScan?.isMatch;
  const isPutAwayConfirmed = currentDelivery?.putAwayConfirmation?.isCorrectLocation;

  return (
    <div className="space-y-4 select-none">
      {/* 1. Storekeeper Banner */}
      <div className="bg-industrial-900 text-white rounded-2xl p-4 border-2 border-industrial-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500 text-industrial-950 rounded-xl font-bold">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Store Receiving & Put-Away Hub — RM-A
            </div>
            <h2 className="text-base font-black text-white">Inbound Verification & Smart Storage Guidance</h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenScanner(isMaterialVerified ? "LOCATION_BARCODE" : "MATERIAL_BARCODE")}
            className="btn-touch px-4 py-2 bg-safety-green hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
          >
            <Barcode className="w-4 h-4" />
            <span>{isMaterialVerified ? "Scan Put-Away Bin" : "Scan Material Barcode"}</span>
          </button>
        </div>
      </div>

      {/* 2. Inbound Queue (TASK-014) */}
      <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-industrial-100 border-b border-industrial-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-4 h-4 text-industrial-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-industrial-700">
              Inbound Receiving Queue (TASK-014)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700">
            {deliveries.filter(d => d.status !== "Complete").length} Active Receipts
          </span>
        </div>

        <div className="divide-y divide-industrial-200">
          {deliveries.map((del) => {
            const isSelected = del.id === currentDelivery?.id;
            const isAtDock = del.status === "At Storage" || del.status === "Verified";
            const isComplete = del.status === "Complete";

            return (
              <div
                key={del.id}
                onClick={() => setSelectedDeliveryId(del.id)}
                className={`p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition ${
                  isSelected
                    ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                    : "hover:bg-industrial-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl font-bold ${
                    isComplete ? "bg-emerald-100 text-emerald-800" : isAtDock ? "bg-blue-600 text-white" : "bg-industrial-200 text-industrial-700"
                  }`}>
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-industrial-900">{del.materialName}</span>
                      <span className="text-xs font-bold text-industrial-500">({del.quantity} {del.unit})</span>
                    </div>
                    <div className="text-xs text-industrial-600">
                      Vehicle: <span className="font-mono font-bold text-industrial-800">{del.vehicleNumber}</span> | Bay: <span className="font-bold text-blue-700">{del.dockAssigned}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-industrial-700">{del.destination}</div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      isComplete
                        ? "bg-safety-green text-white"
                        : isAtDock
                        ? "bg-blue-600 text-white"
                        : "bg-industrial-200 text-industrial-700"
                    }`}>
                      {del.status}
                    </span>
                  </div>
                  <ArrowRight className={`w-4 h-4 ${isSelected ? "text-emerald-700" : "text-industrial-400"}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Material Verification & System Storage Recommendation (TASK-015, TASK-016, TASK-017) */}
      {currentDelivery && (
        <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-industrial-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-industrial-500">
                Material Inspection & Put-Away Execution
              </span>
              <h3 className="text-base font-black text-industrial-900">
                Manifest: {currentDelivery.id} — PO: {currentDelivery.poNumber}
              </h3>
            </div>
            {isPutAwayConfirmed ? (
              <span className="px-3 py-1 bg-safety-green text-white text-xs font-black rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Put-Away Confirmed & Closed</span>
              </span>
            ) : isMaterialVerified ? (
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Material Verified</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500 text-industrial-950 text-xs font-black rounded-full">
                Material Scan Pending
              </span>
            )}
          </div>

          {/* Step A: Material Verification */}
          <div className="p-4 bg-industrial-50 rounded-2xl border border-industrial-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                  isMaterialVerified ? "bg-safety-green text-white" : "bg-industrial-800 text-white"
                }`}>
                  {isMaterialVerified ? "✓" : "1"}
                </div>
                <h4 className="text-sm font-black text-industrial-900">
                  Step 1: Material Verification Scan (TASK-015)
                </h4>
              </div>

              <button
                onClick={() => onOpenScanner("MATERIAL_BARCODE")}
                className="btn-touch px-3 py-1.5 bg-industrial-900 hover:bg-industrial-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <Barcode className="w-3.5 h-3.5 text-safety-green" />
                <span>Scan Material Code</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-industrial-200">
                <span className="text-[10px] text-industrial-500 block uppercase font-bold">Expected Material</span>
                <span className="font-black text-industrial-900 text-sm">{currentDelivery.materialName}</span>
                <div className="font-mono text-industrial-600 mt-1">Code: {currentDelivery.materialCode}</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-industrial-200">
                <span className="text-[10px] text-industrial-500 block uppercase font-bold">Manifest Quantity</span>
                <span className="font-black text-industrial-900 text-sm">{currentDelivery.quantity} {currentDelivery.unit}</span>
                <div className="text-industrial-600 mt-1">Weight: {currentDelivery.weightKg.toLocaleString()} kg</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-industrial-200">
                <span className="text-[10px] text-industrial-500 block uppercase font-bold">Inspection Status</span>
                <div className="mt-1">
                  {isMaterialVerified ? (
                    <span className="text-safety-green font-black flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Barcode Matched PO</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold">Awaiting Barcode Scan</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step B: Storage Recommendation & Location Scan */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border-2 border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                  isPutAwayConfirmed ? "bg-safety-green text-white" : "bg-emerald-700 text-white"
                }`}>
                  {isPutAwayConfirmed ? "✓" : "2"}
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 flex items-center space-x-1.5">
                    <span>Step 2: System Storage Recommendation & Put-Away (TASK-016, 017)</span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </h4>
                </div>
              </div>

              <button
                onClick={() => onOpenScanner("LOCATION_BARCODE")}
                disabled={!isMaterialVerified}
                className={`btn-touch px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 ${
                  isMaterialVerified
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                    : "bg-industrial-200 text-industrial-400 cursor-not-allowed"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Scan Rack Location Marker</span>
              </button>
            </div>

            {/* Smart Storage Recommendation Callout */}
            <div className="bg-white p-4 rounded-xl border-2 border-emerald-300 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-emerald-700 font-black uppercase tracking-wider">
                    SYSTEM-RECOMMENDED STORAGE BIN (OPTIMAL CAPACITY & CRANE PATH)
                  </div>
                  <div className="text-lg font-black text-industrial-950 mt-0.5">
                    {currentDelivery.destination}
                  </div>
                </div>
                <div className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg font-mono font-bold text-xs border border-emerald-300">
                  Target Barcode: {currentDelivery.locationCode}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-industrial-100 text-xs">
                <div>
                  <span className="text-industrial-500 block text-[10px]">Zone</span>
                  <span className="font-bold text-industrial-800">{currentDelivery.zone}</span>
                </div>
                <div>
                  <span className="text-industrial-500 block text-[10px]">Bay / Dock</span>
                  <span className="font-bold text-industrial-800">{currentDelivery.dockAssigned}</span>
                </div>
                <div>
                  <span className="text-industrial-500 block text-[10px]">Put-Away Scan</span>
                  <span className={`font-bold ${isPutAwayConfirmed ? "text-safety-green" : "text-amber-600"}`}>
                    {isPutAwayConfirmed ? "Confirmed ✓" : "Scan Required"}
                  </span>
                </div>
                <div>
                  <span className="text-industrial-500 block text-[10px]">WMS Inventory Sync</span>
                  <span className={`font-bold ${currentDelivery.wmsSynced ? "text-safety-green" : "text-industrial-500"}`}>
                    {currentDelivery.wmsSynced ? "Live Synchronized" : "Pending Put-away"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
