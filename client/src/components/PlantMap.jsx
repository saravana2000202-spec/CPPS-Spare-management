// client/src/components/PlantMap.jsx - Interactive live plant map with geofencing, route guidance, and GPS simulation
import React, { useState } from 'react';
import { 
  Compass, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  Layers, 
  Truck, 
  Play, 
  RotateCcw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function PlantMap({ delivery, onSimulateGeofence, currentRole }) {
  const [showSatellite, setShowSatellite] = useState(false);
  const [activeZoneDetail, setActiveZoneDetail] = useState(null);

  // Map coordinates representation (viewBox 0 0 800 500)
  // Plant boundary: 50, 40 to 750, 460
  // Gate 1 (Inbound): 100, 460 (Bottom-Left)
  // Security Post: 140, 410
  // Dock 1 & Dock 2 (RM Inbound): 380, 240
  // RM Store (Warehouse): 450, 120 to 720, 320
  // Rack A-14: 560, 190
  // Restricted Zone (Chemical): 180, 100 to 320, 210
  // Gate 2 (Outbound): 720, 460 (Bottom-Right)

  // Determine current vehicle GPS point along route based on status
  const getVehiclePosition = () => {
    if (!delivery) return { x: 70, y: 490, label: "Approaching" };
    switch (delivery.status) {
      case "Assigned":
      case "Approaching":
        return { x: 70, y: 485, label: "Approaching Outer Geofence (1.2 km)" };
      case "At Gate":
        return { x: 100, y: 450, label: "At Gate 1 — Security Booth" };
      case "Verified":
      case "En Route":
        return { x: 260, y: 340, label: "Plant Internal Spine Road (En Route)" };
      case "At Storage":
        return { x: 380, y: 240, label: "Dock 2 — Unloading Bay" };
      case "Complete":
        return { x: 560, y: 190, label: "Put-away at Rack A-14 (Complete)" };
      default:
        return { x: 70, y: 485, label: "Approaching" };
    }
  };

  const vehiclePos = getVehiclePosition();

  // Defined simulation waypoints
  const simulationSteps = [
    { key: "APPROACHING_PLANT", label: "1. Approach Outer Fence", targetStatus: "Approaching" },
    { key: "ARRIVED_GATE_1", label: "2. Arrive at Gate 1", targetStatus: "At Gate" },
    { key: "GATE_VERIFIED", label: "3. Gate Clearance (En Route)", targetStatus: "En Route" },
    { key: "ARRIVED_STORAGE_RM", label: "4. Reach Dock 2 (Storage)", targetStatus: "At Storage" },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm overflow-hidden select-none">
      {/* Map Control Bar */}
      <div className="px-4 py-3 bg-industrial-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-industrial-700">
        <div className="flex items-center space-x-2">
          <Compass className="w-5 h-5 text-safety-cyan" />
          <span className="font-bold text-sm tracking-wide">Live Plant Map & Real-Time Navigation</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-industrial-800 text-safety-green border border-safety-green/30">
            GPS: ACTIVE (RTK-10cm)
          </span>
        </div>

        {/* Legend / Overlay Toggles */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-industrial-800 text-industrial-300">
            <span className="w-2.5 h-2.5 rounded-full bg-safety-green"></span>
            <span>Recommended Route</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-industrial-800 text-industrial-300">
            <span className="w-2.5 h-2.5 rounded-full bg-safety-red"></span>
            <span>Restricted Zone</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative bg-industrial-950 p-2 overflow-hidden">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-auto max-h-[380px] select-none"
          style={{ background: "#090d16" }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="plantGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
            </pattern>
            {/* Restricted Area Stripe */}
            <pattern id="restrictedStripe" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#dc2626" strokeWidth="3" opacity="0.35" />
            </pattern>
            {/* Pulsing marker gradient */}
            <radialGradient id="vehiclePulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          <rect x="0" y="0" width="800" height="500" fill="url(#plantGrid)" />

          {/* Plant Outer Perimeter Fence */}
          <rect
            x="50"
            y="40"
            width="700"
            height="420"
            rx="16"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          <text x="65" y="65" fill="#64748b" fontSize="11" fontFamily="monospace" fontWeight="bold">
            PLANT BOUNDARY & VIRTUAL GEOFENCE (RADIUS: 1000m)
          </text>

          {/* Internal Road Network (Highways inside plant) */}
          {/* Main spine road from Gate 1 to Dock 2 */}
          <path
            d="M 100 460 L 100 370 L 260 370 L 260 270 L 380 270 L 380 210 L 560 210"
            fill="none"
            stroke="#1e293b"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Secondary road to Gate 2 */}
          <path
            d="M 380 270 L 520 270 L 520 400 L 720 400 L 720 460"
            fill="none"
            stroke="#1e293b"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Recommended Route Polyline (Green glowing guidance path) */}
          <path
            d="M 100 460 L 100 370 L 260 370 L 260 270 L 380 270 L 380 210 L 560 210"
            fill="none"
            stroke="#16a34a"
            strokeWidth="4"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />

          {/* BUILDINGS & ZONES */}

          {/* 1. Restricted Zone (Chemical Storage & Substation) */}
          <rect
            x="160"
            y="90"
            width="140"
            height="110"
            rx="8"
            fill="url(#restrictedStripe)"
            stroke="#ef4444"
            strokeWidth="2"
          />
          <rect x="160" y="90" width="140" height="24" fill="#7f1d1d" rx="6" />
          <text x="170" y="106" fill="#fecaca" fontSize="10" fontWeight="bold">
            RESTRICTED: CHEMICALS
          </text>
          <text x="175" y="145" fill="#f87171" fontSize="9">
            Authorized Badges Only
          </text>

          {/* 2. Raw Material Warehouse (RM Store) */}
          <rect
            x="420"
            y="80"
            width="300"
            height="230"
            rx="12"
            fill="#1e293b"
            stroke="#0284c7"
            strokeWidth="2"
          />
          <rect x="420" y="80" width="300" height="28" fill="#0369a1" rx="8" />
          <text x="435" y="99" fill="#ffffff" fontSize="12" fontWeight="bold">
            RAW MATERIAL STORE (RM-A)
          </text>

          {/* Racks inside RM Store */}
          {/* Rack A (Heavy Sheet Coils) */}
          <rect x="440" y="130" width="120" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="450" y="155" fill="#bae6fd" fontSize="11" fontWeight="bold">Rack A-12</text>

          {/* Target Rack A-14 (Highlighted with destination gold/green) */}
          <rect
            x="440"
            y="185"
            width="150"
            height="45"
            rx="6"
            fill="#064e3b"
            stroke="#10b981"
            strokeWidth="2.5"
          />
          <text x="450" y="205" fill="#a7f3d0" fontSize="11" fontWeight="black">
            Rack A-14 [Bin 02]
          </text>
          <text x="450" y="222" fill="#34d399" fontSize="9" fontWeight="bold">
            TARGET DESTINATION
          </text>

          {/* Rack B (Aluminium & Non-Ferrous) */}
          <rect x="580" y="130" width="120" height="40" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <text x="595" y="155" fill="#94a3b8" fontSize="11">Rack B-08</text>

          {/* Rack C (Fasteners & Small Parts) */}
          <rect x="610" y="185" width="90" height="45" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <text x="625" y="212" fill="#94a3b8" fontSize="11">Rack C-03</text>

          {/* 3. Unloading Bays & Docks */}
          {/* Dock 1 */}
          <rect x="340" y="140" width="65" height="35" rx="4" fill="#334155" stroke="#64748b" strokeWidth="1" />
          <text x="350" y="162" fill="#f8fafc" fontSize="10" fontWeight="bold">Dock 1</text>

          {/* Dock 2 (Assigned Dock) */}
          <rect
            x="340"
            y="215"
            width="75"
            height="45"
            rx="6"
            fill="#1e3a8a"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <text x="350" y="235" fill="#ffffff" fontSize="11" fontWeight="bold">Dock 2</text>
          <text x="350" y="250" fill="#93c5fd" fontSize="9">RM Inbound</text>

          {/* 4. Finished Goods Warehouse (FG-B) */}
          <rect x="560" y="340" width="160" height="70" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <text x="575" y="365" fill="#cbd5e1" fontSize="11" fontWeight="bold">FG Warehouse (FG-B)</text>
          <text x="575" y="385" fill="#64748b" fontSize="9">Outbound Staging</text>

          {/* 5. GATES & SECURITY BOOTHS */}
          {/* Gate 1 (Inbound North Main) */}
          <g transform="translate(60, 410)">
            <rect x="0" y="0" width="80" height="50" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
            <text x="10" y="20" fill="#fbbf24" fontSize="11" fontWeight="bold">GATE 1</text>
            <text x="10" y="36" fill="#d1d5db" fontSize="9">INBOUND MAIN</text>
            {/* Geofence Ring */}
            <circle cx="40" cy="25" r="30" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          </g>

          {/* Gate 2 (Outbound) */}
          <g transform="translate(680, 410)">
            <rect x="0" y="0" width="60" height="50" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
            <text x="8" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold">GATE 2</text>
            <text x="8" y="38" fill="#64748b" fontSize="8">OUTBOUND</text>
          </g>

          {/* Destination Marker Icon at Rack A-14 */}
          <g transform="translate(560, 190)">
            <circle cx="0" cy="0" r="14" fill="#10b981" />
            <circle cx="0" cy="0" r="22" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.4" className="animate-ping" />
            <text x="-4" y="4" fill="#ffffff" fontSize="12" fontWeight="bold">✓</text>
          </g>

          {/* VEHICLE GPS POSITION MARKER */}
          <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y})`} className="transition-all duration-700 ease-out">
            {/* Pulsing Radar Ring */}
            <circle cx="0" cy="0" r="26" fill="url(#vehiclePulse)" className="animate-pulse" />
            <circle cx="0" cy="0" r="14" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            {/* Truck Icon silhouette */}
            <path
              d="M -6 -4 L 2 -4 L 6 0 L 6 4 L -6 4 Z"
              fill="#ffffff"
            />
            {/* Callout Label Box */}
            <rect x="-70" y="-36" width="140" height="20" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
            <text x="0" y="-23" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold" fontFamily="monospace">
              {delivery?.vehicleNumber || "TN 22 BK 4821"}
            </text>
          </g>
        </svg>

        {/* Current Vehicle Position Overlay Badge */}
        <div className="absolute bottom-3 left-3 bg-industrial-900/90 backdrop-blur-sm border border-industrial-700 px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-2">
          <Truck className="w-4 h-4 text-safety-blue animate-bounce" />
          <span className="font-mono text-industrial-300">Vehicle:</span>
          <span className="font-bold text-white">{vehiclePos.label}</span>
        </div>
      </div>

      {/* Geofence & GPS Simulation Controls (Allow testing and demonstrating TASK-011, TASK-018) */}
      <div className="p-3 bg-industrial-100 border-t border-industrial-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-industrial-700">
            <Play className="w-3.5 h-3.5 text-safety-blue" />
            <span>Interactive Geofence & Route Waypoint Simulator:</span>
          </div>
          <span className="text-[11px] text-industrial-500 font-mono">
            Simulates truck telemetry triggering plant automations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {simulationSteps.map((step, idx) => {
            const isTargetActive = delivery?.status === step.targetStatus;
            return (
              <button
                key={step.key}
                onClick={() => onSimulateGeofence(step.key)}
                className={`btn-touch px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  isTargetActive
                    ? "bg-safety-blue text-white border-blue-700 shadow-sm"
                    : "bg-white hover:bg-industrial-50 text-industrial-700 border-industrial-300"
                }`}
              >
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
