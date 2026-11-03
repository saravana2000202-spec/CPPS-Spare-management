// client/src/components/StatusTracker.jsx - Visual industrial status tracker
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Navigation, 
  MapPin, 
  Barcode, 
  PackageCheck,
  AlertCircle
} from 'lucide-react';

export default function StatusTracker({ delivery }) {
  const steps = [
    { key: "Assigned", label: "Assigned", icon: Clock },
    { key: "Approaching", label: "Approaching", icon: Navigation },
    { key: "At Gate", label: "At Gate", icon: ShieldCheck },
    { key: "Verified", label: "Gate Verified", icon: CheckCircle2 },
    { key: "En Route", label: "En Route", icon: Navigation },
    { key: "At Storage", label: "At Storage", icon: MapPin },
    { key: "Verified_Putaway", label: "Material Scan", icon: Barcode },
    { key: "Complete", label: "Delivered", icon: PackageCheck },
  ];

  // Map backend workflow states to step index
  const getActiveIndex = () => {
    if (!delivery) return 0;
    const status = delivery.status;
    if (status === "Assigned") return 0;
    if (status === "Approaching") return 1;
    if (status === "At Gate") return 2;
    if (status === "Verified" && !delivery.materialScan?.isMatch) return 3;
    if (status === "En Route") return 4;
    if (status === "At Storage") return 5;
    if (status === "Verified" && delivery.materialScan?.isMatch) return 6;
    if (status === "Complete") return 7;
    return delivery.workflowIndex ?? 0;
  };

  const currentIndex = getActiveIndex();

  const getStatusBadge = () => {
    if (!delivery) return { text: "No Active Delivery", bg: "bg-industrial-200 text-industrial-800" };
    switch (delivery.status) {
      case "Complete":
        return { text: "Delivered & Put-Away Closed", bg: "bg-safety-green text-white" };
      case "Verified":
        return { 
          text: delivery.materialScan?.isMatch ? "Material Verified — Put-away Pending" : "Gate Clearance Granted", 
          bg: "bg-emerald-600 text-white" 
        };
      case "En Route":
        return { text: "En Route to Storage Dock", bg: "bg-blue-600 text-white" };
      case "At Storage":
        return { text: "At Storage Point — Unloading", bg: "bg-blue-700 text-white" };
      case "At Gate":
        return { text: "At Gate 1 — Inspection Pending", bg: "bg-amber-600 text-white" };
      case "Approaching":
        return { text: "Approaching Plant Geofence", bg: "bg-amber-500 text-industrial-950" };
      default:
        return { text: "Order Dispatched", bg: "bg-industrial-700 text-white" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm p-4 select-none">
      {/* Top row: current status and ETA */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-industrial-500">Current Operational Phase</span>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${statusBadge.bg} shadow-sm`}>
              {statusBadge.text}
            </span>
          </div>
        </div>

        {delivery && (
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="bg-industrial-100 px-3 py-1.5 rounded-lg border border-industrial-200">
              <span className="text-industrial-500">PO: </span>
              <span className="font-bold text-industrial-900">{delivery.poNumber}</span>
            </div>
            <div className="bg-industrial-100 px-3 py-1.5 rounded-lg border border-industrial-200">
              <span className="text-industrial-500">ETA: </span>
              <span className="font-bold text-industrial-900">{delivery.status === "Complete" ? "Arrived" : delivery.eta}</span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Stepper Tracker */}
      <div className="relative pt-2 pb-1 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[580px] px-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isPassed = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative group">
                {/* Connecting Line between steps */}
                {idx > 0 && (
                  <div 
                    className={`absolute top-4 -left-1/2 w-full h-1 -z-0 transition-colors duration-300 ${
                      idx <= currentIndex ? "bg-safety-green" : "bg-industrial-200"
                    }`}
                  />
                )}

                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all duration-300 shadow-sm ${
                    isPassed
                      ? "bg-safety-green text-white ring-4 ring-safety-green/20"
                      : isCurrent
                      ? "bg-safety-blue text-white ring-4 ring-safety-blue/30 scale-110 animate-pulse"
                      : "bg-industrial-100 text-industrial-400 border-2 border-industrial-300"
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-[11px] text-center font-bold transition-colors ${
                    isCurrent
                      ? "text-safety-blue"
                      : isPassed
                      ? "text-industrial-800"
                      : "text-industrial-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
