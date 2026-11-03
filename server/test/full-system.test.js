// server/test/full-system.test.js - Complete system end-to-end integration and static UI serving test
const http = require("http");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const apiRouter = require("../routes/api");
const store = require("../store");

async function verifyFullSystem() {
  console.log("=== Testing Plant Delivery Guidance System Integration ===");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", apiRouter);

  // Client static serving test
  const clientDistPath = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  const server = http.createServer(app);
  const PORT = 3088;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  let passed = 0;
  let failed = 0;
  const assert = (cond, msg) => {
    if (cond) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Verify index.html UI is served
    console.log("\n1. Testing Frontend UI Delivery");
    const htmlRes = await fetch(`${baseUrl}/`).then(r => r.text());
    assert(htmlRes.includes("Plant Delivery & Storage Guidance"), "Frontend index.html served with correct page title");
    assert(htmlRes.includes("/assets/index-"), "Frontend bundles linked in index.html");

    // 2. Verify Site Master Endpoint
    console.log("\n2. Testing Plant Site Master Telemetry");
    const siteRes = await fetch(`${baseUrl}/api/site`).then(r => r.json());
    assert(siteRes.plant.name.includes("Chennai"), "Site master returns Chennai Unit 4");
    assert(siteRes.users.length === 4, "Found 4 operational user personas (Driver, Security, Storekeeper, Admin)");

    // 3. Verify Delivery Workflow Progression
    console.log("\n3. Testing End-to-End Delivery Life-Cycle");
    // Start Approaching
    await fetch(`${baseUrl}/api/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", geofenceZone: "APPROACHING_PLANT" })
    });
    // Arrived Gate
    await fetch(`${baseUrl}/api/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", geofenceZone: "ARRIVED_GATE_1" })
    });
    // Security Allow Entry
    const gateRes = await fetch(`${baseUrl}/api/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", decision: "ALLOW_ENTRY", guardName: "Suresh Pillai" })
    }).then(r => r.json());
    assert(gateRes.delivery.status === "En Route", "Delivery cleared gate and entered En Route state");

    // Arrived at Store Dock 2
    await fetch(`${baseUrl}/api/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: "DEL-2026-00482", geofenceZone: "ARRIVED_STORAGE_RM" })
    });

    // Material Scan
    const matScan = await fetch(`${baseUrl}/api/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        scanCode: "MAT-STL-9901",
        scanType: "MATERIAL_BARCODE",
        scannedBy: "Manoj Verma",
        role: "Storekeeper"
      })
    }).then(r => r.json());
    assert(matScan.result.valid === true, "Material scanned and validated against manifest");

    // Put-away Scan
    const locScan = await fetch(`${baseUrl}/api/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        scanCode: "LOC-RMA-A14-B02",
        scanType: "LOCATION_BARCODE",
        scannedBy: "Manoj Verma",
        role: "Storekeeper"
      })
    }).then(r => r.json());
    assert(locScan.result.valid === true, "Storage Rack A-14 Bin 02 confirmed");
    assert(locScan.delivery.status === "Complete", "Delivery marked Complete");

    // Driver POD
    const podRes = await fetch(`${baseUrl}/api/driver/pod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryId: "DEL-2026-00482",
        driverSignature: "Rajesh Kumar (Digital Token)",
        receiverName: "Manoj Verma"
      })
    }).then(r => r.json());
    assert(podRes.delivery.proofOfDelivery !== null, "Proof of delivery attached to delivery");

    // Audit Trail Verification
    const auditRes = await fetch(`${baseUrl}/api/audit?deliveryId=DEL-2026-00482`).then(r => r.json());
    assert(auditRes.length >= 6, `Complete audit log has ${auditRes.length} records for DEL-2026-00482`);

  } catch (err) {
    console.error("System test error:", err);
    failed++;
  } finally {
    server.close();
    console.log("\n=======================================================");
    console.log(`  System Tests Passed: ${passed}`);
    console.log(`  System Tests Failed: ${failed}`);
    console.log("=======================================================");
    if (failed > 0) process.exit(1);
  }
}

verifyFullSystem();
