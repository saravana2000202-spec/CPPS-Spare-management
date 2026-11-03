// server/test/parts.test.js - Automated tests for Critical Parts Analyzer & Separator
const http = require('http');
const express = require('express');
const cors = require('cors');
const partsRouter = require('../routes/parts');

async function runPartsTests() {
  console.log("=======================================================");
  console.log("  Running Critical Parts API & Logic Automated Tests");
  console.log("=======================================================");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/parts', partsRouter);

  const server = http.createServer(app);
  const PORT = 3098;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}/api/parts`;

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
    // 1. Summary Endpoint Test
    const sumRes = await fetch(`${baseUrl}/summary`).then(r => r.json());
    assert(sumRes && sumRes.totalParts >= 7000, `Summary reports 7,000+ parts (Found: ${sumRes?.totalParts})`);
    assert(sumRes.criticalCount > 0, `Critical parts identified (Count: ${sumRes.criticalCount})`);
    assert(sumRes.criticalPct > 0 && sumRes.criticalPct < 100, `Critical percentage calculated (${sumRes.criticalPct}%)`);
    assert(sumRes.strategicSparesCount > 0, `Strategic capital spares identified (${sumRes.strategicSparesCount})`);
    assert(Array.isArray(sumRes.top20Risks) && sumRes.top20Risks.length === 20, `Top 20 risk spares returned`);

    // 2. Separate Critical Parts Filter Test
    const critRes = await fetch(`${baseUrl}?filter=CRITICAL&pageSize=50`).then(r => r.json());
    assert(critRes.parts && critRes.parts.length === 50, `Returns 50 paginated critical parts`);
    const allCritical = critRes.parts.every(p => p.categoryTag === 'CRITICAL');
    assert(allCritical, `All returned parts in CRITICAL filter are strictly Critical`);

    // 3. Strategic Spare Override Rule Verification
    const strategicParts = critRes.parts.filter(p => p.isStrategic);
    assert(strategicParts.length > 0, `Strategic spares are present in critical list`);
    const validOverrides = strategicParts.every(p => p.impactScore === 3 && p.leadTimeScore === 3);
    assert(validOverrides, `All Strategic spares strictly satisfy Vital (3) AND Long Lead Time (3)`);

    // 4. Search Functionality Test
    const searchRes = await fetch(`${baseUrl}?search=Valve&pageSize=10`).then(r => r.json());
    assert(searchRes.parts.length > 0, `Search for 'Valve' returns matching parts`);
    const matchesKeyword = searchRes.parts.every(p => 
      p.description.toLowerCase().includes('valve') || 
      p.category.toLowerCase().includes('valve') ||
      p.supplier.toLowerCase().includes('valve') ||
      p.equipmentStation.toLowerCase().includes('valve')
    );
    assert(matchesKeyword, `All search results match 'valve' across description, category, or supplier`);

    // 5. Dynamic Recalculation Test (Weight Tuning)
    const tuningRes = await fetch(`${baseUrl}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        impactWeight: 0.50,
        leadTimeWeight: 0.30,
        usageWeight: 0.20,
        criticalCutoff: 2.35
      })
    }).then(r => r.json());
    assert(tuningRes.success === true, `Weights & cutoffs dynamically updated`);

    // 6. CSV Export Test
    const exportRes = await fetch(`${baseUrl}/export?filter=CRITICAL`);
    assert(exportRes.status === 200, `Export endpoint returns HTTP 200`);
    const contentType = exportRes.headers.get('content-type');
    assert(contentType && contentType.includes('text/csv'), `Content-Type is text/csv`);
    const csvText = await exportRes.text();
    const csvLines = csvText.trim().split('\n');
    assert(csvLines.length > 100, `Exported CSV contains data lines (Lines: ${csvLines.length})`);
    assert(csvLines[0].includes('Part_Number') && (csvLines[0].includes('Composite_Score') || csvLines[0].includes('Composite_Criticality_Score')), `CSV contains correct headers`);

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    server.close();
    console.log("-------------------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed.`);
    console.log("=======================================================\n");
    if (failed > 0) process.exit(1);
  }
}

runPartsTests();
