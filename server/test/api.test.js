// server/test/api.test.js - Comprehensive automated test suite for backend API & workflow logic
const http = require("http");
const express = require("express");
const cors = require("cors");
const apiRouter = require("../routes/api");
const store = require("../store");

async function runTests() {
  console.log("=== Starting Plant Material Delivery API Test Suite ===");

  // Reset store before testing
  store.reset();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", apiRouter);
  app.get("/health", (req, res) => res.json({ status: "healthy" }));

  const server = http.createServer(app);
  const PORT = 3099;

  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    console.log("\n1. Testing Health Endpoint");
    const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
    assert(healthRes.status === "healthy", "Health endpoint responds with healthy status");

    // 2. Auth & RBAC (TASK-001, TASK-002)
    console.log("\n2. Testing Authentication & RBAC");
    const roles = ["Driver", "Security Guard", "Storekeeper", "Admin"];
    for (const r of roles) {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r }),
      }).then((res) => res.json());

      assert(loginRes.success === true, `Login successful for role: ${r}`);
      assert(loginRes.user.role === r, `Assigned user role matches: ${r}`);
      assert(Array.isArray(loginRes.permissions) && loginRes.permissions.length > 0, `Permissions granted for role: ${r}`);
    }

    // 3. Delivery Query (TASK-006, TASK-010)
    console.log("\n3. Testing Delivery Queries");
    const deliveries = await fetch(`${baseUrl}/api/deliveries`).then((r) => r.json());
    assert(Array.isArray(deliveries) && deliveries.length >= 3, `Returned ${deliveries.length} deliveries from store`);
    const d1 = deliveries.find((d) => d.id === "DEL-2026-00482");
    assert(d1 !== undefined, "Found primary delivery DEL-2026-00482");
    assert(d1.vehicleNumber === "TN 22 BK 4821", "Vehicle number matches TN 22 BK 4821");

    // 4. Geofence Automated Alert Engine (TASK-011, TASK-018, TASK-019, TASK-020)
    console.log("\n4. Testing Geofence Automation");
    const geoApproaching = await fetch(`${baseUrl}/api/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", geofenceZone: "APPROACHING_PLANT" }),
    }).then((r) => r.json());
    assert(geoApproaching.delivery.status === "Approaching", "Delivery state updated to Approaching on geofence trigger");

    const geoGate = await fetch(`${baseUrl}/api/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", geofenceZone: "ARRIVED_GATE_1" }),
    }).then((r) => r.json());
    assert(geoGate.delivery.status === "At Gate", "Delivery state updated to At Gate on Gate 1 arrival");

    // Verify security notification created
    const notifs = await fetch(`${baseUrl}/api/notifications?role=Security Guard`).then((r) => r.json());
    assert(notifs.length > 0, "Security Guard received automated arrival notifications");

    // 5. Gate Clearance Decision (TASK-012, TASK-013)
    console.log("\n5. Testing Security Gate Decision");
    const gateDecision = await fetch(`${baseUrl}/api/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        decision: "ALLOW_ENTRY",
        guardName: "Suresh Pillai",
        notes: "Documents & seal inspected and verified OK",
      }),
    }).then((r) => r.json());
    assert(gateDecision.delivery.status === "En Route", "Delivery state transitioned to En Route after gate clearance");
    assert(gateDecision.delivery.securityVerification.decision === "ALLOW_ENTRY", "Security verification decision recorded as ALLOW_ENTRY");

    // 6. Arrival at Unloading Store (TASK-014)
    console.log("\n6. Testing Destination Arrival");
    const geoStorage = await fetch(`${baseUrl}/api/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", geofenceZone: "ARRIVED_STORAGE_RM" }),
    }).then((r) => r.json());
    assert(geoStorage.delivery.status === "At Storage", "Delivery state updated to At Storage");

    // 7. Multi-mode Barcode Scanning (TASK-009, TASK-015, TASK-017)
    console.log("\n7. Testing Barcode & QR Scans");
    // Invalid QR test
    const scanInvalidQR = await fetch(`${baseUrl}/api/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        scanCode: "DEL-WRONG-99999",
        scanType: "DELIVERY_QR",
        scannedBy: "Rajesh Kumar",
        role: "Driver",
      }),
    }).then((r) => r.json());
    assert(scanInvalidQR.result.valid === false, "Invalid QR properly rejected");

    // Valid Material Barcode test
    const scanMaterial = await fetch(`${baseUrl}/api/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        scanCode: "MAT-STL-9901",
        scanType: "MATERIAL_BARCODE",
        scannedBy: "Manoj Verma",
        role: "Storekeeper",
      }),
    }).then((r) => r.json());
    assert(scanMaterial.result.valid === true, "Material barcode MAT-STL-9901 verified against PO manifest");
    assert(scanMaterial.delivery.status === "Verified", "Delivery status updated to Verified");

    // Wrong Storage Location scan
    const scanWrongLoc = await fetch(`${baseUrl}/api/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        scanCode: "LOC-WRG-999",
        scanType: "LOCATION_BARCODE",
        scannedBy: "Manoj Verma",
        role: "Storekeeper",
      }),
    }).then((r) => r.json());
    assert(scanWrongLoc.result.valid === false, "Wrong storage location scan rejected");

    // Valid Storage Location Put-Away scan
    const scanValidLoc = await fetch(`${baseUrl}/api/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        scanCode: "LOC-RMA-A14-B02",
        scanType: "LOCATION_BARCODE",
        scannedBy: "Manoj Verma",
        role: "Storekeeper",
      }),
    }).then((r) => r.json());
    assert(scanValidLoc.result.valid === true, "Correct location LOC-RMA-A14-B02 confirmed");
    assert(scanValidLoc.delivery.status === "Complete", "Delivery marked Complete upon correct put-away scan");
    assert(scanValidLoc.delivery.wmsSynced === true, "WMS Sync flag set to true");

    // 8. Proof of Delivery (TASK-006)
    console.log("\n8. Testing Proof of Delivery (POD)");
    const podRes = await fetch(`${baseUrl}/api/driver/pod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        driverSignature: "Rajesh Kumar (Digital)",
        receiverName: "Manoj Verma",
        notes: "Clean delivery, zero damage",
      }),
    }).then((r) => r.json());
    assert(podRes.success === true, "Proof of delivery recorded with digital signature");

    // 9. Exceptions Management (TASK-022, TASK-023)
    console.log("\n9. Testing Exceptions & Escalation");
    const exceptions = await fetch(`${baseUrl}/api/exceptions`).then((r) => r.json());
    assert(exceptions.length >= 2, `Exceptions recorded: ${exceptions.length} (including invalid QR and wrong location)`);

    const openExc = exceptions[0];
    const resolveRes = await fetch(`${baseUrl}/api/exceptions/${openExc.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionNotes: "Verified by Admin Anita Sharma with manual override" }),
    }).then((r) => r.json());
    assert(resolveRes.status === "RESOLVED", "Exception resolved by Admin");

    // 10. Audit Trail (TASK-027)
    console.log("\n10. Testing Audit Trail Ledger");
    const auditLogs = await fetch(`${baseUrl}/api/audit`).then((r) => r.json());
    assert(auditLogs.length > 5, `Audit log captured ${auditLogs.length} events`);
    const hasGateEvent = auditLogs.some((e) => e.event === "GATE_ENTRY_APPROVED");
    assert(hasGateEvent, "Audit log contains GATE_ENTRY_APPROVED event");

    // 11. WMS Sync & Offline Batch Sync (TASK-021, TASK-025)
    console.log("\n11. Testing WMS Offline Queue Sync");
    const batchSyncRes = await fetch(`${baseUrl}/api/wms/sync-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offlineQueue: [
          { id: "Q-1", type: "OFFLINE_SCAN", deliveryId: "DEL-2026-00482", payload: { scan: "LOC-RMA-A14-B02" } },
        ],
      }),
    }).then((r) => r.json());
    assert(batchSyncRes.success === true, "Offline batch sync successfully processed");
    assert(batchSyncRes.processedCount === 1, "1 offline queue transaction processed");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
    console.log("\n=======================================================");
    console.log(`  Tests Passed: ${passed}`);
    console.log(`  Tests Failed: ${failed}`);
    console.log("=======================================================");
    if (failed > 0) process.exit(1);
  }
}

runTests();
