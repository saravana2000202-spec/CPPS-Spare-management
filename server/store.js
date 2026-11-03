// server/store.js - In-memory and persistent operational state store

class OperationalStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.plant = {
      id: "PLANT-CPPS-01",
      name: "Cab Panel Press Shop (CPPS)",
      address: "Hosur Manufacturing Complex, Plant 2003, NPE1 Maintain. Store",
      currentGate: "Gate 1 (North Main Inbound)",
      activeZone: "Maintain. Store (NPE1)"
    };

    this.users = [
      { id: "u_driver", username: "driver", password: "123", name: "PE Team Driver", role: "Driver", phone: "+91 98765 43210", vehicle: "TN 22 BK 4821" },
      { id: "u_security", username: "security", password: "123", name: "Suresh Pillai", role: "Security Guard", gate: "Gate 1" },
      { id: "u_store", username: "store", password: "123", name: "Manoj Verma", role: "Storekeeper", store: "NPE1 Maintain. Store" },
      { id: "u_admin", username: "admin", password: "123", name: "PE Team", role: "Admin", site: "Cab Panel Press Shop (CPPS)" }
    ];

    this.deliveries = [
      {
        id: "DEL-2026-00482",
        poNumber: "PO-IND-882910",
        vendor: "Tata Steel Tubes & Sheets Ltd.",
        driverName: "PE Team Driver",
        driverPhone: "+91 98765 43210",
        vehicleNumber: "TN 22 BK 4821",
        materialName: "Sheet Metal Coil (CR 304)",
        materialCode: "MAT-STL-9901",
        quantity: 12,
        unit: "pallets",
        weightKg: 6400,
        gateAssigned: "Gate 1 (North Main)",
        dockAssigned: "Dock 2 (RM Inbound)",
        destination: "RM Store — Rack A-14 — Bin 02",
        store: "RM Store",
        zone: "Zone A (Heavy Metal)",
        rack: "Rack A-14",
        bin: "Bin 02",
        locationCode: "LOC-RMA-A14-B02",
        eta: "08 min",
        status: "Approaching", // Workflow states: Assigned -> Approaching -> At Gate -> Verified -> En Route -> At Storage -> Verified -> Complete
        workflowIndex: 1, // 0: Assigned, 1: Approaching, 2: At Gate, 3: Verified, 4: En Route, 5: At Storage, 6: Material Verified, 7: Complete
        securityVerification: {
          verifiedAt: null,
          verifiedBy: null,
          decision: null, // "ALLOW_ENTRY" | "HOLD" | "ESCALATE"
          notes: ""
        },
        materialScan: {
          scannedAt: null,
          scannedCode: null,
          isMatch: false,
          receivedQuantity: 12,
          condition: "GOOD"
        },
        putAwayConfirmation: {
          confirmedAt: null,
          locationScanned: null,
          isCorrectLocation: false,
          confirmedBy: null
        },
        proofOfDelivery: null,
        wmsSynced: false,
        wmsSyncTimestamp: null,
        createdAt: new Date().toISOString()
      },
      {
        id: "DEL-2026-00483",
        poNumber: "PO-IND-882915",
        vendor: "Sundram Fasteners Co.",
        driverName: "Karthik Raja",
        driverPhone: "+91 97890 12345",
        vehicleNumber: "TN 09 AB 1234",
        materialName: "M10 High-Tensile Hex Bolts",
        materialCode: "MAT-FST-4022",
        quantity: 40,
        unit: "boxes",
        weightKg: 850,
        gateAssigned: "Gate 1 (North Main)",
        dockAssigned: "Dock 1 (General Bulk)",
        destination: "RM Store — Rack C-03 — Bin 05",
        store: "RM Store",
        zone: "Zone C (Fasteners)",
        rack: "Rack C-03",
        bin: "Bin 05",
        locationCode: "LOC-RMA-C03-B05",
        eta: "25 min",
        status: "Assigned",
        workflowIndex: 0,
        securityVerification: null,
        materialScan: null,
        putAwayConfirmation: null,
        proofOfDelivery: null,
        wmsSynced: false,
        wmsSyncTimestamp: null,
        createdAt: new Date().toISOString()
      },
      {
        id: "DEL-2026-00484",
        poNumber: "PO-IND-882920",
        vendor: "Vedanta Aluminium Products",
        driverName: "Vikram Patil",
        driverPhone: "+91 91234 56789",
        vehicleNumber: "KA 01 MJ 8821",
        materialName: "Aluminum Alloy Ingots 6061",
        materialCode: "MAT-ALU-6061",
        quantity: 8,
        unit: "pallets",
        weightKg: 4200,
        gateAssigned: "Gate 1 (North Main)",
        dockAssigned: "Dock 3 (Smelting Staging)",
        destination: "RM Store — Rack B-08 — Bin 01",
        store: "RM Store",
        zone: "Zone B (Non-Ferrous)",
        rack: "Rack B-08",
        bin: "Bin 01",
        locationCode: "LOC-RMA-B08-B01",
        eta: "45 min",
        status: "Assigned",
        workflowIndex: 0,
        securityVerification: null,
        materialScan: null,
        putAwayConfirmation: null,
        proofOfDelivery: null,
        wmsSynced: false,
        wmsSyncTimestamp: null,
        createdAt: new Date().toISOString()
      }
    ];

    this.auditEvents = [
      {
        id: "AUD-001",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userId: "u_admin",
        userName: "PE Team",
        role: "Admin",
        event: "DELIVERY_ORDER_SYNCED_ERP",
        deliveryId: "DEL-2026-00482",
        location: "ERP Gateway",
        deviceId: "SRV-WMS-01",
        details: "Inbound delivery order DEL-2026-00482 imported from SAP ERP / WMS."
      },
      {
        id: "AUD-002",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        userId: "u_driver",
        userName: "PE Team Driver",
        role: "Driver",
        event: "DRIVER_ASSIGNMENT_ACCEPTED",
        deliveryId: "DEL-2026-00482",
        location: "GPS (12.9821 N, 79.9723 E)",
        deviceId: "MOB-DRV-001",
        details: "PE Team Driver accepted dispatch for vehicle TN 22 BK 4821."
      }
    ];

    this.exceptions = [];

    this.notifications = [
      {
        id: "NOTIF-001",
        targetRole: "Security Guard",
        title: "Vehicle Approaching Geofence",
        message: "Truck TN 22 BK 4821 is 1.2 km from Gate 1. ETA: 08 min.",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        read: false,
        deliveryId: "DEL-2026-00482"
      }
    ];

    this.wmsSyncLog = [
      {
        id: "SYNC-001",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        direction: "INBOUND",
        payloadType: "DELIVERY_CREATION",
        deliveryId: "DEL-2026-00482",
        status: "SUCCESS"
      }
    ];
  }

  // Helper methods
  getDelivery(id) {
    return this.deliveries.find(d => d.id === id);
  }

  addAuditEvent({ userId, userName, role, event, deliveryId, location, deviceId, details }) {
    const eventRecord = {
      id: `AUD-${String(this.auditEvents.length + 1).padStart(3, "0")}`,
      timestamp: new Date().toISOString(),
      userId: userId || "SYSTEM",
      userName: userName || "System Automated Trigger",
      role: role || "SYSTEM",
      event,
      deliveryId: deliveryId || "N/A",
      location: location || "Plant Geofence Area",
      deviceId: deviceId || "WEB-CLIENT",
      details
    };
    this.auditEvents.unshift(eventRecord);
    return eventRecord;
  }

  addNotification({ targetRole, title, message, deliveryId }) {
    const notif = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      targetRole, // "Driver" | "Security Guard" | "Storekeeper" | "Admin" | "ALL"
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      deliveryId: deliveryId || null
    };
    this.notifications.unshift(notif);
    return notif;
  }

  addException({ code, reason, deliveryId, reportedBy, role, notes, priority = "HIGH" }) {
    const exc = {
      id: `EXC-${Date.now()}`,
      code,
      reason,
      deliveryId,
      reportedBy,
      role,
      notes,
      priority,
      status: "OPEN", // "OPEN" | "ESCALATED" | "RESOLVED"
      escalatedTo: "PE Team (Admin)",
      createdAt: new Date().toISOString()
    };
    this.exceptions.unshift(exc);

    this.addAuditEvent({
      userId: reportedBy,
      userName: reportedBy,
      role,
      event: `EXCEPTION_RAISED_${code}`,
      deliveryId,
      details: `Exception [${code}]: ${reason}. Notes: ${notes}`
    });

    this.addNotification({
      targetRole: "Admin",
      title: `Exception Raised: ${code}`,
      message: `Delivery ${deliveryId} held by ${role}: ${reason}`,
      deliveryId
    });

    return exc;
  }
}

module.exports = new OperationalStore();
