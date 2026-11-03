// client/src/App.jsx - Root application coordinating multi-role views, plant map, telemetry, and offline sync
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatusTracker from './components/StatusTracker';
import PlantMap from './components/PlantMap';
import QuickActions from './components/QuickActions';
import DriverView from './views/DriverView';
import SecurityView from './views/SecurityView';
import StorekeeperView from './views/StorekeeperView';
import AdminView from './views/AdminView';
import CriticalPartsView from './views/CriticalPartsView';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import ExceptionModal from './components/ExceptionModal';
import NotificationDrawer from './components/NotificationDrawer';
import OfflineManagerModal from './components/OfflineManagerModal';
import TestRunnerModal from './components/TestRunnerModal';
import { api, offlineMgr, sound, RealtimeChannel } from './api';
import { 
  Activity, 
  Wifi, 
  MapPin, 
  ShieldCheck, 
  Database, 
  Navigation,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState("CriticalParts");
  const [currentUser, setCurrentUser] = useState(null);
  const [plant, setPlant] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [offlineStatus, setOfflineStatus] = useState(offlineMgr.getStatus());
  const [notifications, setNotifications] = useState([]);
  const [deviceView, setDeviceView] = useState("rugged"); // "rugged" | "mobile" | "desktop"

  // Modal controls
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState("DELIVERY_QR");
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [offlineManagerOpen, setOfflineManagerOpen] = useState(false);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);

  // Active delivery (primary tracking)
  const activeDelivery = deliveries.find(d => d.id === "DEL-2026-00482") || deliveries[0];

  // Refresh operational state from backend
  const refreshState = useCallback(async () => {
    try {
      const [delivs, notifs, siteInfo] = await Promise.all([
        api.getDeliveries(),
        api.getNotifications(currentRole),
        fetch('http://localhost:3001/api/site').then(r => r.json()).catch(() => null)
      ]);
      if (delivs && Array.isArray(delivs)) setDeliveries(delivs);
      if (notifs && Array.isArray(notifs)) setNotifications(notifs);
      if (siteInfo?.plant) setPlant(siteInfo.plant);
    } catch (err) {
      console.warn("Could not fetch remote state (may be offline):", err);
    }
  }, [currentRole]);

  // Initial load and role login
  useEffect(() => {
    api.login(currentRole).then((res) => {
      if (res.success) {
        setCurrentUser(res.user);
        setPlant(res.plant);
      }
    }).catch(console.warn);

    refreshState();

    // Subscribe to offline manager status updates
    const unsubOffline = offlineMgr.subscribe(setOfflineStatus);

    // Subscribe to WebSocket real-time telemetry
    const wsChannel = new RealtimeChannel((msg) => {
      if (msg.type === "INIT_STATE") {
        setDeliveries(msg.data.deliveries);
        setPlant(msg.data.plant);
      } else if (msg.type === "DELIVERY_UPDATED" || msg.type === "GEOFENCE_EVENT" || msg.type === "GATE_DECISION" || msg.type === "SCAN_COMPLETED") {
        refreshState();
      }
    });

    return () => {
      unsubOffline();
      wsChannel.close();
    };
  }, [currentRole, refreshState]);

  // Handle role switch
  const handleRoleChange = async (newRole) => {
    sound.playBeep();
    setCurrentRole(newRole);
    try {
      const res = await api.login(newRole);
      if (res.success) setCurrentUser(res.user);
      const notifs = await api.getNotifications(newRole);
      setNotifications(notifs);
    } catch (e) {
      console.warn("Role switch error", e);
    }
  };

  // Open barcode scanner with explicit code type
  const handleOpenScanner = (type = "DELIVERY_QR") => {
    setScannerType(type);
    setScannerOpen(true);
  };

  // Geofence simulation triggers (TASK-011, TASK-018)
  const handleSimulateGeofence = async (zone) => {
    try {
      await api.triggerGeofence(activeDelivery?.id || "DEL-2026-00482", zone, currentRole);
      refreshState();
    } catch (err) {
      alert("Geofence error: " + err.message);
    }
  };

  // Quick Action handler
  const handleQuickAction = (actionKey) => {
    sound.playBeep();
    if (actionKey === "VERIFY_GATE") {
      handleOpenScanner("DELIVERY_QR");
    } else if (actionKey === "PUTAWAY_GUIDANCE") {
      handleOpenScanner("LOCATION_BARCODE");
    } else if (actionKey === "DRIVER_POD") {
      // Driver POD trigger
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else if (actionKey === "AUDIT_LOGS") {
      setCurrentRole("Admin");
    }
  };

  // Reset Demo state
  const handleResetDemo = async () => {
    if (confirm("Reset all deliveries, audit logs, and test states to initial seed?")) {
      await api.resetDemo();
      refreshState();
      sound.playSuccess();
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-industrial-100 flex flex-col antialiased">
      {/* 1. Global Industrial Header */}
      <Header
        currentUser={currentUser}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        plant={plant}
        offlineStatus={offlineStatus}
        onToggleOffline={() => offlineMgr.setForcedOffline(!offlineStatus.forcedOffline)}
        unreadNotifsCount={unreadNotifsCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
        deviceView={deviceView}
        onDeviceViewChange={setDeviceView}
        onOpenTestRunner={() => setTestRunnerOpen(true)}
        onOpenOfflineManager={() => setOfflineManagerOpen(true)}
        onResetDemo={handleResetDemo}
      />

      {/* 2. Device Viewport Wrapper (Rugged Handheld / Smartphone / Desktop) */}
      <main className="flex-1 flex justify-center p-2 sm:p-4 md:p-6">
        <div
          className={`w-full transition-all duration-300 ${
            currentRole === "CriticalParts"
              ? "max-w-7xl"
              : deviceView === "rugged"
              ? "max-w-2xl bg-white rugged-frame rugged-bumper border-8 border-industrial-800 p-3 sm:p-5"
              : deviceView === "mobile"
              ? "max-w-md bg-white rounded-3xl border-4 border-industrial-800 shadow-2xl p-3 sm:p-4"
              : "max-w-6xl"
          }`}
        >
          {currentRole === "CriticalParts" ? (
            <CriticalPartsView />
          ) : (
            <>
              {/* Rugged Terminal Speaker & Sensor Notch (when in rugged view) */}
              {deviceView === "rugged" && (
                <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-industrial-200">
                  <span className="font-mono text-[10px] font-black text-industrial-500 uppercase tracking-widest">
                    ZEBRA TC57 RUGGED HANDHELD TERMINAL — IP68
                  </span>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-safety-green font-bold">
                    <span className="w-2 h-2 rounded-full bg-safety-green animate-ping"></span>
                    <span>SYSTEM ONLINE</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* 3. Automation Indicators Bar (SPEC.md Section 3) */}
                <div className="bg-industrial-900 text-white p-2.5 rounded-xl border border-industrial-700 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs font-mono select-none">
                  <div className="flex items-center space-x-1.5 text-safety-green">
                    <Activity className="w-3.5 h-3.5" />
                    <span>GPS: ACTIVE (±10cm)</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-safety-cyan">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Geofence: INSIDE PLANT</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-amber-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Gate: {activeDelivery?.securityVerification?.decision === "ALLOW_ENTRY" ? "VERIFIED" : "CHECK REQUIRED"}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Storage: RACK A-14</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-blue-400">
                    <Database className="w-3.5 h-3.5" />
                    <span>WMS Sync: LIVE</span>
                  </div>
                </div>

                {/* 4. Live Operational Status Tracker (TASK-004) */}
                <StatusTracker delivery={activeDelivery} />

                {/* 5. Live Plant Map with Geofencing & Navigation (TASK-007, TASK-018) */}
                <PlantMap
                  delivery={activeDelivery}
                  onSimulateGeofence={handleSimulateGeofence}
                  currentRole={currentRole}
                />

                {/* 6. Glove-Friendly Quick Actions (TASK-005) */}
                <QuickActions
                  currentRole={currentRole}
                  onOpenScanner={() => handleOpenScanner("DELIVERY_QR")}
                  onNavigate={() => window.scrollTo({ top: 180, behavior: 'smooth' })}
                  onViewDelivery={() => {
                    if (currentRole !== "Driver") setCurrentRole("Driver");
                  }}
                  onOpenExceptions={() => setExceptionsOpen(true)}
                  onQuickAction={handleQuickAction}
                />

                {/* 7. Dynamic Role-Based Main Content (TASK-003) */}
                <div className="pt-1">
                  {currentRole === "Driver" && (
                    <DriverView
                      delivery={activeDelivery}
                      onOpenScanner={handleOpenScanner}
                      onOpenExceptions={() => setExceptionsOpen(true)}
                      currentUser={currentUser}
                    />
                  )}

                  {currentRole === "Security Guard" && (
                    <SecurityView
                      deliveries={deliveries}
                      activeDelivery={activeDelivery}
                      onOpenScanner={handleOpenScanner}
                      onOpenExceptions={() => setExceptionsOpen(true)}
                      currentUser={currentUser}
                    />
                  )}

                  {currentRole === "Storekeeper" && (
                    <StorekeeperView
                      deliveries={deliveries}
                      activeDelivery={activeDelivery}
                      onOpenScanner={handleOpenScanner}
                      onOpenExceptions={() => setExceptionsOpen(true)}
                      currentUser={currentUser}
                    />
                  )}

                  {currentRole === "Admin" && (
                    <AdminView
                      currentUser={currentUser}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* 8. MODALS & DRAWERS */}
      {/* Optical Barcode / QR Scanner */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        delivery={activeDelivery}
        defaultScanType={scannerType}
        currentUser={currentUser}
        currentRole={currentRole}
        onScanSuccess={() => {
          refreshState();
        }}
      />

      {/* Exception Reporting Modal */}
      <ExceptionModal
        isOpen={exceptionsOpen}
        onClose={() => setExceptionsOpen(false)}
        delivery={activeDelivery}
        currentUser={currentUser}
        currentRole={currentRole}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onRefresh={refreshState}
        currentRole={currentRole}
      />

      {/* Offline Storage Manager Modal */}
      <OfflineManagerModal
        isOpen={offlineManagerOpen}
        onClose={() => setOfflineManagerOpen(false)}
        offlineStatus={offlineStatus}
        onToggleOffline={() => offlineMgr.setForcedOffline(!offlineStatus.forcedOffline)}
      />

      {/* Automated Acceptance Test Suite Modal (TASK-029 to 033) */}
      <TestRunnerModal
        isOpen={testRunnerOpen}
        onClose={() => setTestRunnerOpen(false)}
        onWorkflowStep={refreshState}
      />
    </div>
  );
}
