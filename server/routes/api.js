// server/routes/api.js - REST API routes for all role workflows and automations
const express = require("express");
const router = express.Router();
const store = require("../store");

// Middleware to broadcast WebSocket events if wsBroadcast helper exists
const broadcastChange = (req, eventType, data) => {
  if (req.app.locals.wsBroadcast) {
    req.app.locals.wsBroadcast({ type: eventType, data, timestamp: new Date().toISOString() });
  }
};

// 1. Auth & RBAC (TASK-001, TASK-002)
router.post("/auth/login", (req, res) => {
  const { username, role } = req.body;
  let user = store.users.find(u => u.username === username || (role && u.role === role));
  if (!user) {
    // Default fallback user if role requested
    user = store.users.find(u => u.role === role) || store.users[0];
  }

  // Define role permissions matrix
  const permissions = {
    "Driver": ["VIEW_ASSIGNED_DELIVERY", "NAVIGATE_PLANT", "SCAN_DELIVERY_QR", "CAPTURE_POD", "REPORT_EXCEPTION"],
    "Security Guard": ["VIEW_EXPECTED_VEHICLES", "RECEIVE_GEOFENCE_ALERTS", "VERIFY_GATE_ENTRY", "DECIDE_ENTRY", "REPORT_EXCEPTION"],
    "Storekeeper": ["VIEW_INBOUND_QUEUE", "SCAN_MATERIAL", "VERIFY_MANIFEST", "VIEW_STORAGE_RECOMMENDATION", "CONFIRM_PUTAWAY", "REPORT_EXCEPTION"],
    "Admin": ["FULL_ACCESS", "VIEW_AUDIT_TRAIL", "MANAGE_MASTER_DATA", "RESOLVE_EXCEPTIONS", "WMS_RECONCILIATION"]
  };

  store.addAuditEvent({
    userId: user.id,
    userName: user.name,
    role: user.role,
    event: "USER_AUTHENTICATED",
    details: `User ${user.name} logged in as ${user.role} on ${store.plant.name}`
  });

  return res.json({
    success: true,
    user,
    plant: store.plant,
    permissions: permissions[user.role] || []
  });
});

// Plant Site Master (TASK-003)
router.get("/site", (req, res) => {
  res.json({
    plant: store.plant,
    users: store.users.map(u => ({ id: u.id, name: u.name, role: u.role, vehicle: u.vehicle, gate: u.gate, store: u.store }))
  });
});

// 2. Deliveries (TASK-006, TASK-010, TASK-014)
router.get("/deliveries", (req, res) => {
  const { role, id } = req.query;
  if (id) {
    const d = store.getDelivery(id);
    return d ? res.json(d) : res.status(404).json({ error: "Delivery not found" });
  }
  res.json(store.deliveries);
});

router.get("/deliveries/:id", (req, res) => {
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });
  res.json(delivery);
});

// Workflow state transition (TASK-004)
router.post("/deliveries/:id/status", (req, res) => {
  const { status, user, role } = req.body;
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  const states = ["Assigned", "Approaching", "At Gate", "Verified", "En Route", "At Storage", "Verified", "Complete"];
  const newIndex = states.indexOf(status);

  delivery.status = status;
  if (newIndex >= 0) delivery.workflowIndex = newIndex;

  store.addAuditEvent({
    userId: user || "SYSTEM",
    userName: user || "Workflow Engine",
    role: role || "SYSTEM",
    event: `DELIVERY_STATUS_CHANGED_${status.toUpperCase().replace(/\s+/g, "_")}`,
    deliveryId: delivery.id,
    details: `Delivery ${delivery.id} status transitioned to '${status}'`
  });

  broadcastChange(req, "DELIVERY_UPDATED", delivery);
  res.json({ success: true, delivery });
});

// 3. Geofence Engine & Automated Alerts (TASK-011, TASK-018, TASK-019, TASK-020)
router.post("/geofence/trigger", (req, res) => {
  const { deliveryId, geofenceZone, userRole } = req.body;
  const delivery = store.getDelivery(deliveryId || "DEL-2026-00482");
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  let eventMessage = "";
  if (geofenceZone === "APPROACHING_PLANT") {
    delivery.status = "Approaching";
    delivery.workflowIndex = 1;
    eventMessage = `Vehicle ${delivery.vehicleNumber} is approaching outer geofence. ETA: 08 min.`;
    store.addNotification({
      targetRole: "Security Guard",
      title: "Vehicle Approaching Geofence",
      message: eventMessage,
      deliveryId: delivery.id
    });
  } else if (geofenceZone === "ARRIVED_GATE_1") {
    delivery.status = "At Gate";
    delivery.workflowIndex = 2;
    eventMessage = `Vehicle ${delivery.vehicleNumber} arrived at Gate 1 Inbound Zone. Inspection pending.`;
    store.addNotification({
      targetRole: "Security Guard",
      title: "Vehicle Arrived at Gate 1",
      message: eventMessage,
      deliveryId: delivery.id
    });
  } else if (geofenceZone === "ARRIVED_STORAGE_RM") {
    delivery.status = "At Storage";
    delivery.workflowIndex = 5;
    eventMessage = `Vehicle ${delivery.vehicleNumber} reached RM Store / Dock 2. Ready for unloading.`;
    store.addNotification({
      targetRole: "Storekeeper",
      title: "Material Arrived at Dock 2",
      message: eventMessage,
      deliveryId: delivery.id
    });
  }

  store.addAuditEvent({
    userId: userRole || "GPS-TRACKER",
    userName: "Geofence Engine",
    role: userRole || "SYSTEM",
    event: `GEOFENCE_TRIGGER_${geofenceZone}`,
    deliveryId: delivery.id,
    location: geofenceZone,
    details: eventMessage
  });

  broadcastChange(req, "GEOFENCE_EVENT", { delivery, geofenceZone, message: eventMessage });
  res.json({ success: true, delivery, message: eventMessage });
});

// 4. Security Gate Verification & Entry Decision (TASK-012, TASK-013)
router.post("/gate/decision", (req, res) => {
  const { deliveryId, decision, guardName, notes } = req.body;
  const delivery = store.getDelivery(deliveryId);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  delivery.securityVerification = {
    verifiedAt: new Date().toISOString(),
    verifiedBy: guardName || "Suresh Pillai",
    decision, // "ALLOW_ENTRY" | "HOLD" | "ESCALATE"
    notes: notes || ""
  };

  if (decision === "ALLOW_ENTRY") {
    delivery.status = "En Route";
    delivery.workflowIndex = 4;

    store.addNotification({
      targetRole: "Driver",
      title: "Gate Clearance Approved",
      message: `Entry cleared through Gate 1. Proceed to Dock 2 (${delivery.destination}).`,
      deliveryId: delivery.id
    });

    store.addNotification({
      targetRole: "Storekeeper",
      title: "Inbound Vehicle Cleared Gate",
      message: `Vehicle ${delivery.vehicleNumber} with ${delivery.materialName} is en route to Dock 2.`,
      deliveryId: delivery.id
    });

    store.addAuditEvent({
      userId: "u_security",
      userName: guardName || "Suresh Pillai",
      role: "Security Guard",
      event: "GATE_ENTRY_APPROVED",
      deliveryId: delivery.id,
      location: "Gate 1 North Main",
      details: `Gate clearance granted to vehicle ${delivery.vehicleNumber} (Driver: ${delivery.driverName}). Assigned: ${delivery.dockAssigned}`
    });
  } else if (decision === "HOLD") {
    delivery.status = "At Gate";
    store.addException({
      code: "VEHICLE_HELD_AT_GATE",
      reason: "Security inspection hold: " + (notes || "Discrepancy in manifest or driver documents"),
      deliveryId: delivery.id,
      reportedBy: guardName || "Suresh Pillai",
      role: "Security Guard",
      notes: notes || "Held at Gate 1"
    });
  } else if (decision === "ESCALATE") {
    store.addException({
      code: "SECURITY_ESCALATION",
      reason: "Security flag raised: " + (notes || "Unrecognized vehicle or driver"),
      deliveryId: delivery.id,
      reportedBy: guardName || "Suresh Pillai",
      role: "Security Guard",
      notes: notes || "Escalated to Site Admin"
    });
  }

  broadcastChange(req, "GATE_DECISION", { delivery, decision });
  res.json({ success: true, delivery, decision });
});

// 5. Multi-Mode QR & Barcode Scanner Validation (TASK-009, TASK-012, TASK-015, TASK-017)
router.post("/scans/validate", (req, res) => {
  const { scanCode, scanType, deliveryId, scannedBy, role } = req.body;
  const delivery = store.getDelivery(deliveryId || "DEL-2026-00482");

  if (!delivery) {
    return res.status(404).json({ valid: false, message: "Delivery not found" });
  }

  let result = { valid: false, match: false, scanType, scanCode, message: "" };

  if (scanType === "DELIVERY_QR") {
    if (scanCode === delivery.id) {
      result.valid = true;
      result.match = true;
      result.message = `Verified Delivery Manifest ${delivery.id} for Vehicle ${delivery.vehicleNumber}`;
      store.addAuditEvent({
        userId: scannedBy,
        userName: scannedBy,
        role,
        event: "DELIVERY_QR_VALIDATED",
        deliveryId: delivery.id,
        details: `Delivery QR code match: ${delivery.id}`
      });
    } else {
      result.valid = false;
      result.match = false;
      result.message = `Invalid Delivery QR. Expected ${delivery.id}, got ${scanCode}`;
      store.addException({
        code: "INVALID_QR",
        reason: `Scanned QR code '${scanCode}' does not match assigned delivery ${delivery.id}`,
        deliveryId: delivery.id,
        reportedBy: scannedBy || "User",
        role: role || "Driver",
        notes: `Mismatch on delivery QR scan.`
      });
    }
  } else if (scanType === "MATERIAL_BARCODE") {
    if (scanCode === delivery.materialCode) {
      result.valid = true;
      result.match = true;
      result.message = `Material Verified: ${delivery.materialName} (${delivery.materialCode}). Matches PO manifest.`;
      delivery.materialScan = {
        scannedAt: new Date().toISOString(),
        scannedCode: scanCode,
        isMatch: true,
        receivedQuantity: delivery.quantity,
        condition: "GOOD"
      };
      delivery.workflowIndex = 6;
      delivery.status = "Verified";

      store.addAuditEvent({
        userId: scannedBy,
        userName: scannedBy,
        role: "Storekeeper",
        event: "MATERIAL_MANIFEST_VERIFIED",
        deliveryId: delivery.id,
        details: `Material ${delivery.materialCode} verified against PO ${delivery.poNumber}`
      });
    } else {
      result.valid = false;
      result.match = false;
      result.message = `Material Mismatch! Scanned '${scanCode}', expected '${delivery.materialCode}' (${delivery.materialName})`;
      store.addException({
        code: "WRONG_MATERIAL",
        reason: `Scanned material code '${scanCode}' differs from expected '${delivery.materialCode}'`,
        deliveryId: delivery.id,
        reportedBy: scannedBy || "Storekeeper",
        role: "Storekeeper",
        notes: "Potential shipment error from vendor."
      });
    }
  } else if (scanType === "LOCATION_BARCODE") {
    if (scanCode === delivery.locationCode) {
      result.valid = true;
      result.match = true;
      result.message = `Storage Location Confirmed: ${delivery.destination} (${delivery.locationCode})`;
      delivery.putAwayConfirmation = {
        confirmedAt: new Date().toISOString(),
        locationScanned: scanCode,
        isCorrectLocation: true,
        confirmedBy: scannedBy || "Manoj Verma"
      };
      delivery.workflowIndex = 7;
      delivery.status = "Complete";
      delivery.wmsSynced = true;
      delivery.wmsSyncTimestamp = new Date().toISOString();

      store.addAuditEvent({
        userId: scannedBy,
        userName: scannedBy,
        role: "Storekeeper",
        event: "PUTAWAY_CONFIRMED_LOCATION",
        deliveryId: delivery.id,
        location: delivery.destination,
        details: `Put-away verified at ${delivery.destination}. WMS inventory updated.`
      });

      // WMS Sync Record
      store.wmsSyncLog.unshift({
        id: `SYNC-${Date.now()}`,
        timestamp: new Date().toISOString(),
        direction: "OUTBOUND",
        payloadType: "PUTAWAY_CONFIRMATION",
        deliveryId: delivery.id,
        status: "SUCCESS",
        details: `Quantity ${delivery.quantity} ${delivery.unit} placed in ${delivery.locationCode}`
      });

      store.addNotification({
        targetRole: "ALL",
        title: `Delivery Closed: ${delivery.id}`,
        message: `Material received and safely put away in ${delivery.destination}.`,
        deliveryId: delivery.id
      });
    } else {
      result.valid = false;
      result.match = false;
      result.message = `Wrong Location! Scanned '${scanCode}', recommended destination is '${delivery.locationCode}' (${delivery.destination})`;
      store.addException({
        code: "WRONG_STORAGE_LOCATION",
        reason: `Scanned put-away location '${scanCode}' does not match recommended rack '${delivery.locationCode}'`,
        deliveryId: delivery.id,
        reportedBy: scannedBy || "Storekeeper",
        role: "Storekeeper",
        notes: "Driver/Storekeeper attempted storage in incorrect rack."
      });
    }
  }

  broadcastChange(req, "SCAN_COMPLETED", { delivery, result });
  res.json({ result, delivery });
});

// 6. Proof of Delivery (TASK-006, TASK-021)
router.post("/driver/pod", (req, res) => {
  const { deliveryId, driverSignature, receiverName, photoUrl, notes } = req.body;
  const delivery = store.getDelivery(deliveryId);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  delivery.proofOfDelivery = {
    capturedAt: new Date().toISOString(),
    driverSignature: driverSignature || "Signed digitally by Rajesh Kumar",
    receiverName: receiverName || "Manoj Verma (Storekeeper)",
    photoUrl: photoUrl || "/assets/delivery-pallet-proof.png",
    notes: notes || "Material delivered in sealed condition."
  };

  store.addAuditEvent({
    userId: "u_driver",
    userName: delivery.driverName,
    role: "Driver",
    event: "PROOF_OF_DELIVERY_CAPTURED",
    deliveryId: delivery.id,
    details: `Digital POD signed. Receiver: ${delivery.proofOfDelivery.receiverName}`
  });

  broadcastChange(req, "POD_RECORDED", { delivery });
  res.json({ success: true, delivery });
});

// 7. Exceptions Management (TASK-022, TASK-023)
router.get("/exceptions", (req, res) => {
  res.json(store.exceptions);
});

router.post("/exceptions", (req, res) => {
  const { code, reason, deliveryId, reportedBy, role, notes, priority } = req.body;
  const exc = store.addException({ code, reason, deliveryId, reportedBy, role, notes, priority });
  broadcastChange(req, "EXCEPTION_CREATED", exc);
  res.status(201).json(exc);
});

router.post("/exceptions/:id/resolve", (req, res) => {
  const exc = store.exceptions.find(e => e.id === req.params.id);
  if (!exc) return res.status(404).json({ error: "Exception not found" });

  exc.status = "RESOLVED";
  exc.resolvedAt = new Date().toISOString();
  exc.resolutionNotes = req.body.resolutionNotes || "Approved with supervisor waiver.";

  store.addAuditEvent({
    userId: "u_admin",
    userName: "Anita Sharma",
    role: "Admin",
    event: "EXCEPTION_RESOLVED",
    deliveryId: exc.deliveryId,
    details: `Exception ${exc.code} resolved: ${exc.resolutionNotes}`
  });

  broadcastChange(req, "EXCEPTION_RESOLVED", exc);
  res.json(exc);
});

// 8. Audit Trail (TASK-027)
router.get("/audit", (req, res) => {
  const { deliveryId, role, limit } = req.query;
  let list = store.auditEvents;
  if (deliveryId) list = list.filter(e => e.deliveryId === deliveryId);
  if (role) list = list.filter(e => e.role === role);
  if (limit) list = list.slice(0, parseInt(limit, 10));
  res.json(list);
});

// 9. Notifications (TASK-020)
router.get("/notifications", (req, res) => {
  const { role } = req.query;
  let list = store.notifications;
  if (role) list = list.filter(n => n.targetRole === role || n.targetRole === "ALL");
  res.json(list);
});

router.post("/notifications/mark-read", (req, res) => {
  const { id, role } = req.body;
  store.notifications.forEach(n => {
    if (!id || n.id === id) {
      if (!role || n.targetRole === role || n.targetRole === "ALL") {
        n.read = true;
      }
    }
  });
  res.json({ success: true });
});

// 10. WMS & Offline Sync Engine (TASK-021, TASK-025, TASK-026)
router.get("/wms/status", (req, res) => {
  res.json({
    wmsSyncLog: store.wmsSyncLog,
    activeDeliveriesCount: store.deliveries.length,
    completedCount: store.deliveries.filter(d => d.status === "Complete").length
  });
});

router.post("/wms/sync-queue", (req, res) => {
  const { offlineQueue } = req.body; // Array of queued scans or transactions
  if (!Array.isArray(offlineQueue)) {
    return res.status(400).json({ error: "Invalid queue format" });
  }

  const results = [];
  for (const item of offlineQueue) {
    // Process each queued offline transaction
    store.addAuditEvent({
      userId: item.user || "OFFLINE_AGENT",
      userName: item.user || "Offline Sync Agent",
      role: item.role || "SYSTEM",
      event: `OFFLINE_SYNC_${item.type}`,
      deliveryId: item.deliveryId,
      details: `Processed offline queued transaction: ${JSON.stringify(item.payload)}`
    });
    results.push({ id: item.id, status: "SYNCED" });
  }

  store.wmsSyncLog.unshift({
    id: `SYNC-${Date.now()}`,
    timestamp: new Date().toISOString(),
    direction: "OUTBOUND",
    payloadType: "OFFLINE_BATCH_SYNC",
    status: "SUCCESS",
    details: `Synced ${results.length} offline queued actions.`
  });

  broadcastChange(req, "WMS_SYNCED", { count: results.length });
  res.json({ success: true, processedCount: results.length, results });
});

// Reset demo state
router.post("/reset", (req, res) => {
  store.reset();
  broadcastChange(req, "STORE_RESET", {});
  res.json({ success: true, message: "Demo data reset successfully" });
});

module.exports = router;
