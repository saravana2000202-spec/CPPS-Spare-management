// client/src/components/Header.jsx - Industrial header with site details, role selector, and connection badges
import React from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  Wifi, 
  WifiOff, 
  Bell, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  ShieldCheck, 
  Truck, 
  PackageCheck, 
  SlidersHorizontal,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export default function Header({
  currentUser,
  currentRole,
  onRoleChange,
  plant,
  offlineStatus,
  onToggleOffline,
  unreadNotifsCount,
  onOpenNotifications,
  deviceView,
  onDeviceViewChange,
  onOpenTestRunner,
  onOpenOfflineManager,
  onResetDemo
}) {
  const roles = [
    { id: "CriticalParts", label: "Critical Parts Analyzer", icon: ShieldAlert, color: "bg-red-600 ring-2 ring-red-400" },
    { id: "Driver", label: "Driver", icon: Truck, color: "bg-blue-600" },
    { id: "Security Guard", label: "Security", icon: ShieldCheck, color: "bg-amber-600" },
    { id: "Storekeeper", label: "Storekeeper", icon: PackageCheck, color: "bg-emerald-600" },
    { id: "Admin", label: "Supervisor", icon: SlidersHorizontal, color: "bg-purple-600" }
  ];

  return (
    <header className="bg-industrial-900 text-white border-b-2 border-industrial-700 select-none shadow-md">
      {/* Top utility row */}
      <div className="px-4 py-2 border-b border-industrial-800 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center space-x-2 text-industrial-300">
          <Building2 className="w-3.5 h-3.5 text-safety-green" />
          <span className="font-semibold text-white tracking-wide">{plant?.name || "Cab Panel Press Shop (CPPS)"}</span>
          <span className="text-industrial-500">|</span>
          <div className="flex items-center space-x-1 text-industrial-300">
            <MapPin className="w-3 h-3 text-safety-cyan" />
            <span className="font-mono text-industrial-200">{plant?.currentGate || "Gate 1 (North Main)"}</span>
          </div>
        </div>

        {/* Device Viewport Selector & Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Viewport Frame Mode */}
          <div className="hidden sm:flex items-center bg-industrial-800 rounded p-0.5 border border-industrial-700">
            <button
              onClick={() => onDeviceViewChange("rugged")}
              title="Industrial Rugged Terminal (Zebra TC57)"
              className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition ${
                deviceView === "rugged" ? "bg-industrial-700 text-white shadow-sm font-bold text-safety-green" : "text-industrial-400 hover:text-industrial-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Rugged PDA</span>
            </button>
            <button
              onClick={() => onDeviceViewChange("mobile")}
              title="Smartphone Viewport"
              className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition ${
                deviceView === "mobile" ? "bg-industrial-700 text-white shadow-sm font-bold" : "text-industrial-400 hover:text-industrial-200"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
            <button
              onClick={() => onDeviceViewChange("desktop")}
              title="Full Screen / Tablet Viewport"
              className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition ${
                deviceView === "desktop" ? "bg-industrial-700 text-white shadow-sm font-bold" : "text-industrial-400 hover:text-industrial-200"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          </div>

          {/* Test Runner Button */}
          <button
            onClick={onOpenTestRunner}
            className="px-2.5 py-1 bg-industrial-800 hover:bg-industrial-700 text-safety-green border border-safety-green/40 hover:border-safety-green rounded font-semibold text-xs flex items-center space-x-1 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Acceptance Tests</span>
          </button>

          {/* Reset Demo */}
          <button
            onClick={onResetDemo}
            title="Reset All Test Deliveries and States"
            className="px-2 py-1 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white border border-industrial-700 rounded transition flex items-center space-x-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main header row */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Role Selector Pill */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-industrial-800 p-1 rounded-xl border border-industrial-700">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onRoleChange(r.id)}
                  className={`btn-touch px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-bold transition ${
                    isActive
                      ? `${r.color} text-white shadow-md ring-2 ring-white/20`
                      : "text-industrial-400 hover:text-industrial-100 hover:bg-industrial-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{r.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block pl-2">
            <div className="text-xs text-industrial-400 font-mono">Logged as:</div>
            <div className="text-sm font-bold text-white flex items-center space-x-1">
              <span>{currentUser?.name || "Active Operator"}</span>
              <span className="text-[11px] font-normal px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-300">
                {currentRole}
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicators & Notification */}
        <div className="flex items-center space-x-3">
          {/* Offline / Online Connection Toggle */}
          <button
            onClick={onOpenOfflineManager}
            className={`btn-touch px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition ${
              offlineStatus.isOffline
                ? "bg-amber-950/80 border-amber-600 text-amber-300"
                : "bg-emerald-950/60 border-emerald-600 text-emerald-400"
            }`}
          >
            {offlineStatus.isOffline ? (
              <>
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span className="font-mono">Offline ({offlineStatus.pendingCount} queued)</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="font-mono">Online / Live</span>
              </>
            )}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="btn-touch relative p-2.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 hover:text-white rounded-lg border border-industrial-700 transition"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-safety-red text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-industrial-900 animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
