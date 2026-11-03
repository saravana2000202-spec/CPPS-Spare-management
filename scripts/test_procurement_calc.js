// scripts/test_procurement_calc.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1. Load NPE1 history transactions
console.log('Loading NPE1 history...');
const histWb = XLSX.readFile('C:/Users/PS 2/Downloads/NPE1 history.xlsx');
const histRows = XLSX.utils.sheet_to_json(histWb.Sheets['Data']);

// Aggregate consumption by Material and Month
// 32 months total (2024-04 to 2026-11)
const TOTAL_MONTHS = 32;

const matHistory = new Map();

histRows.forEach(r => {
  const mat = String(r.Material || '').trim();
  if (!mat) return;

  const mvt = String(r['Movement Type'] || '').trim();
  const qty = Number(r.Quantity || 0);

  // Issues: 201, 261, 551 (negative in SAP)
  // Reversals: 202, 262 (positive in SAP)
  let consumed = 0;
  if (['201', '261', '551'].includes(mvt)) {
    consumed = Math.abs(qty);
  } else if (['202', '262'].includes(mvt)) {
    consumed = -Math.abs(qty); // Reversal
  }

  if (consumed !== 0) {
    if (!matHistory.has(mat)) {
      matHistory.set(mat, {
        totalConsumed: 0,
        monthlyBuckets: {},
        txCount: 0,
        lastDate: null
      });
    }

    const stat = matHistory.get(mat);
    stat.totalConsumed += consumed;
    stat.txCount++;

    // Track monthly bucket (YYYY-MM)
    const dateSerial = Number(r['Posting Date'] || r['Entry Date']);
    if (dateSerial && !isNaN(dateSerial)) {
      const d = new Date((dateSerial - 25569) * 86400 * 1000);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      stat.monthlyBuckets[ym] = (stat.monthlyBuckets[ym] || 0) + consumed;
      if (!stat.lastDate || d > stat.lastDate) {
        stat.lastDate = d;
      }
    }
  }
});

console.log(`Aggregated history for ${matHistory.size} unique consumed materials.`);

// 2. Load existing 7,340 parts database
const partsPath = path.resolve(__dirname, '../server/data/imported_parts.json');
const parts = JSON.parse(fs.readFileSync(partsPath, 'utf8'));

console.log(`Processing ${parts.length} plant parts...`);

const procurementBreakdown = {
  CRITICAL_STOCKOUT: 0,
  REORDER_TRIGGERED: 0,
  HEALTHY: 0,
  OVERSTOCK: 0
};

const enrichedParts = parts.map(p => {
  const matId = String(p.partNumber).trim();
  const hist = matHistory.get(matId);

  let totalConsumed = 0;
  let avgMonthlyUsage = 0;
  let maxMonthlyUsage = 0;
  let txCount = 0;
  let lastConsumedDate = null;

  if (hist) {
    totalConsumed = Math.max(0, Math.round(hist.totalConsumed));
    avgMonthlyUsage = Number((totalConsumed / TOTAL_MONTHS).toFixed(2));
    const monthlyValues = Object.values(hist.monthlyBuckets);
    maxMonthlyUsage = monthlyValues.length > 0 ? Math.max(...monthlyValues) : 0;
    txCount = hist.txCount;
    lastConsumedDate = hist.lastDate ? hist.lastDate.toISOString().split('T')[0] : null;
  }

  // Lead times in months (Avg and Max)
  let avgLtMonths = 0.5;
  let maxLtMonths = 1.0;
  let baselineSS = 1;

  const ltRank = p.leadTimeRank || 2;
  if (ltRank === 1) {
    avgLtMonths = 0.25; maxLtMonths = 0.5; baselineSS = 1;
  } else if (ltRank === 2) {
    avgLtMonths = 0.5; maxLtMonths = 1.0; baselineSS = 1;
  } else if (ltRank === 3) {
    avgLtMonths = 1.0; maxLtMonths = 1.5; baselineSS = 2;
  } else if (ltRank === 4) {
    avgLtMonths = 2.0; maxLtMonths = 3.0; baselineSS = 3;
  } else if (ltRank === 5) {
    avgLtMonths = 3.5; maxLtMonths = 5.0; baselineSS = 4;
  }

  // Plant Safety Stock Formula: (Max Usage × Max LT) − (Avg Usage × Avg LT)
  const calcSS = Math.round((maxMonthlyUsage * maxLtMonths) - (avgMonthlyUsage * avgLtMonths));
  const safetyStock = Math.max(baselineSS, calcSS);

  // Minimum Stock = Safety Stock
  const minStock = safetyStock;

  // Reorder Level (ROL / ROP): (Avg Usage × LT) + Safety Stock
  const reorderLevel = Math.max(minStock, Math.round((avgMonthlyUsage * avgLtMonths) + safetyStock));

  // Reorder Quantity (ROQ):
  let roq = Math.max(1, Math.round(avgMonthlyUsage * Math.max(1, avgLtMonths)));
  if (roq < 1) roq = Math.max(1, Math.round(safetyStock * 0.5));
  if (p.excelRisk === 'C' && roq < 2) roq = 2; // Keep at least 2 units batch for critical spares

  // Maximum Stock = Minimum Stock + ROQ
  const maxStock = minStock + roq;

  // Current Stock from SAP
  const currentStock = Number(p.currentStock || 0);

  // Procurement Trigger Indication
  let procurementStatus = 'HEALTHY';
  let procurementAction = 'Sufficient stock on hand';
  let procurementUrgency = 'LOW';
  let suggestedOrderQty = 0;

  if (currentStock <= 0) {
    procurementStatus = 'CRITICAL_STOCKOUT';
    procurementAction = '🚨 URGENT: Zero stock! Immediate Purchase Requisition / Expediting required.';
    procurementUrgency = 'CRITICAL';
    suggestedOrderQty = Math.max(roq, reorderLevel);
  } else if (currentStock < minStock) {
    procurementStatus = 'CRITICAL_STOCKOUT';
    procurementAction = `🚨 URGENT: Safety stock breached (${currentStock}/${minStock} ${p.uom || 'EA'}). Raise Indent immediately.`;
    procurementUrgency = 'CRITICAL';
    suggestedOrderQty = Math.max(roq, maxStock - currentStock);
  } else if (currentStock <= reorderLevel) {
    procurementStatus = 'REORDER_TRIGGERED';
    procurementAction = `⚠️ REORDER POINT HIT: Stock at ${currentStock} ${p.uom || 'EA'} (ROL: ${reorderLevel}). Procure ${roq} ${p.uom || 'EA'}.`;
    procurementUrgency = 'MEDIUM';
    suggestedOrderQty = roq;
  } else if (currentStock > maxStock) {
    procurementStatus = 'OVERSTOCK';
    procurementAction = `📦 OVERSTOCK: Stock (${currentStock} ${p.uom || 'EA'}) exceeds Max level (${maxStock}). Defer procurement.`;
    procurementUrgency = 'NONE';
    suggestedOrderQty = 0;
  } else {
    procurementStatus = 'HEALTHY';
    procurementAction = `✅ HEALTHY: Stock (${currentStock} ${p.uom || 'EA'}) is within normal operating buffer.`;
    procurementUrgency = 'NONE';
    suggestedOrderQty = 0;
  }

  procurementBreakdown[procurementStatus]++;

  return {
    ...p,
    // Consumption History
    totalConsumed32Mo: totalConsumed,
    avgMonthlyUsage,
    maxMonthlyUsage,
    txCount,
    lastConsumedDate,
    hasConsumptionHistory: totalConsumed > 0,
    // Inventory Planning Parameters
    safetyStock,
    minStock,
    reorderLevel,
    roq,
    maxStock,
    suggestedOrderQty,
    // Procurement Indication
    procurementStatus,
    procurementAction,
    procurementUrgency
  };
});

console.log('\n--- Procurement Status Summary across 7,340 Parts ---');
console.log(procurementBreakdown);

// Critical Spares Procurement Summary
const critStockouts = enrichedParts.filter(p => p.categoryTag === 'CRITICAL' && p.procurementStatus === 'CRITICAL_STOCKOUT').length;
const critReorders = enrichedParts.filter(p => p.categoryTag === 'CRITICAL' && p.procurementStatus === 'REORDER_TRIGGERED').length;
console.log(`\nCritical Spares needing procurement: ${critStockouts} stockout + ${critReorders} reorder = ${critStockouts + critReorders} total critical purchase actions!`);

// Save enriched data back to imported_parts.json
fs.writeFileSync(partsPath, JSON.stringify(enrichedParts, null, 2), 'utf8');
console.log('Successfully saved enriched parts database with consumption & procurement parameters!');
