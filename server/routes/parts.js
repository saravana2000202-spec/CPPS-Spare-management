// server/routes/parts.js - API routes for Plant Parts Criticality Analysis, Consumption & Procurement
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { generatePlantParts } = require('../data/parts_generator');

// Default scoring weights & thresholds
let currentConfig = {
  impactWeight: 0.45,
  leadTimeWeight: 0.35,
  usageWeight: 0.20,
  criticalCutoff: 2.30,
  semiCutoff: 1.70,
  ltHighCutoff: 60,
  ltMedCutoff: 15
};

// In-memory dataset: load genuine plant parts from imported_parts.json if available
const importedPartsPath = path.resolve(__dirname, '../data/imported_parts.json');
let rawParts = [];
let dataSourceName = 'Synthetic Catalog';

function loadInitialData() {
  if (fs.existsSync(importedPartsPath)) {
    try {
      rawParts = JSON.parse(fs.readFileSync(importedPartsPath, 'utf8'));
      dataSourceName = 'Cab Panel Press Shop (CPPS) — Hosur Plant 2003 (Critical Spare.xlsx + NPE1 history.xlsx)';
      console.log(`[Parts Router] Successfully loaded ${rawParts.length} real plant parts from database.`);
    } catch (e) {
      console.warn('Error reading imported_parts.json, falling back to generator:', e);
      rawParts = generatePlantParts(7250);
    }
  } else {
    rawParts = generatePlantParts(7250);
  }
}

loadInitialData();

let scoredParts = [];

// Compute percentiles for usage dynamically
function getUsagePercentiles(parts) {
  const qtys = parts.map(p => Number(p.annualQtyUsed || p.totalConsumed32Mo || 0)).sort((a, b) => a - b);
  const n = qtys.length;
  if (n === 0) return { p50: 10, p80: 50 };
  const p50 = qtys[Math.floor(n * 0.50)] || 10;
  const p80 = qtys[Math.floor(n * 0.80)] || 50;
  return { p50, p80 };
}

// Score and assign inventory & procurement metrics to a single part
function scorePart(part, config, usagePercentiles) {
  // 1. Impact Score (VED)
  let impactScore = 1;
  const impactStr = String(part.downtimeImpactLevel || '').toUpperCase();
  if (impactStr.includes('VITAL') || impactStr.includes('STOP') || impactStr.includes('CRITICAL') || impactStr === '3' || (part.prodImpactRank && part.prodImpactRank >= 4)) {
    impactScore = 3;
  } else if (impactStr.includes('ESSENTIAL') || impactStr.includes('MEDIUM') || impactStr === '2' || part.prodImpactRank === 3) {
    impactScore = 2;
  } else {
    impactScore = 1;
  }

  // 2. Lead Time Score (SDE)
  let leadTimeScore = 1;
  const lt = part.leadTimeDays !== null && part.leadTimeDays !== undefined ? Number(part.leadTimeDays) : null;
  if (lt === null || isNaN(lt)) {
    leadTimeScore = 1;
  } else if (lt > config.ltHighCutoff || (part.leadTimeRank && part.leadTimeRank >= 4)) {
    leadTimeScore = 3;
  } else if (lt >= config.ltMedCutoff || (part.leadTimeRank && part.leadTimeRank >= 2)) {
    leadTimeScore = 2;
  } else {
    leadTimeScore = 1;
  }

  // 3. Usage Score (Percentile)
  let usageScore = 1;
  const qty = Number(part.annualQtyUsed || (part.avgMonthlyUsage ? part.avgMonthlyUsage * 12 : 0)) || 0;
  if (qty >= usagePercentiles.p80) {
    usageScore = 3;
  } else if (qty >= usagePercentiles.p50) {
    usageScore = 2;
  } else {
    usageScore = 1;
  }

  // 4. Composite Criticality Index
  const compositeScore = Number((
    (config.impactWeight * impactScore) +
    (config.leadTimeWeight * leadTimeScore) +
    (config.usageWeight * usageScore)
  ).toFixed(2));

  // 5. Strategic Spare Override Rule: Vital (3) AND Long Lead Time (3)
  const isStrategic = (impactScore === 3 && leadTimeScore === 3);

  // 6. Classification Tier
  let classification = 'NON-CRITICAL';
  let categoryTag = 'NON-CRITICAL';
  let isOverride = false;

  if (part.excelRisk === 'C' || (part.excelRank && part.excelRank >= 18)) {
    classification = 'CRITICAL (Plant Matrix)';
    categoryTag = 'CRITICAL';
    isOverride = true;
  } else if (isStrategic) {
    classification = 'CRITICAL (Strategic Spare)';
    categoryTag = 'CRITICAL';
    isOverride = true;
  } else if (compositeScore >= config.criticalCutoff) {
    classification = 'CRITICAL';
    categoryTag = 'CRITICAL';
  } else if (compositeScore >= config.semiCutoff || (part.excelRank && part.excelRank >= 13)) {
    classification = 'SEMI-CRITICAL';
    categoryTag = 'SEMI-CRITICAL';
  } else {
    classification = 'NON-CRITICAL';
    categoryTag = 'NON-CRITICAL';
  }

  // 7. Inventory Planning Parameters: Safety Stock, Min, ROL, ROQ, Max
  const maxMonthlyUsage = Number(part.maxMonthlyUsage || 0);
  const avgMonthlyUsage = Number(part.avgMonthlyUsage || 0);

  let avgLtMonths = 0.5;
  let maxLtMonths = 1.0;
  let baselineSS = 1;

  const ltRank = part.leadTimeRank || (lt > 90 ? 5 : lt >= 60 ? 4 : lt >= 28 ? 3 : lt >= 14 ? 2 : 1);
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

  // Plant Safety Stock formula: (Max Usage × Max LT) − (Avg Usage × Avg LT)
  const calcSS = Math.round((maxMonthlyUsage * maxLtMonths) - (avgMonthlyUsage * avgLtMonths));
  const safetyStock = Math.max(baselineSS, calcSS);
  const minStock = safetyStock;
  const reorderLevel = Math.max(minStock, Math.round((avgMonthlyUsage * avgLtMonths) + safetyStock));

  // Reorder Quantity (ROQ)
  let roq = Math.max(1, Math.round(avgMonthlyUsage * Math.max(1, avgLtMonths)));
  if (roq < 1) roq = Math.max(1, Math.round(safetyStock * 0.5));
  if (categoryTag === 'CRITICAL' && roq < 2) roq = 2;

  const maxStock = minStock + roq;
  const currentStock = Number(part.currentStock || 0);

  // 8. Procurement Indication Trigger
  let procurementStatus = 'HEALTHY';
  let procurementAction = 'Sufficient stock on hand';
  let procurementUrgency = 'NONE';
  let suggestedOrderQty = 0;

  if (currentStock <= 0) {
    procurementStatus = 'CRITICAL_STOCKOUT';
    procurementAction = '🚨 URGENT: Zero stock on hand! Raise Purchase Requisition immediately.';
    procurementUrgency = 'CRITICAL';
    suggestedOrderQty = Math.max(roq, reorderLevel);
  } else if (currentStock < minStock) {
    procurementStatus = 'CRITICAL_STOCKOUT';
    procurementAction = `🚨 URGENT: Safety stock breached (${currentStock}/${minStock} ${part.uom || 'EA'}). Place emergency indent.`;
    procurementUrgency = 'CRITICAL';
    suggestedOrderQty = Math.max(roq, maxStock - currentStock);
  } else if (currentStock <= reorderLevel) {
    procurementStatus = 'REORDER_TRIGGERED';
    procurementAction = `⚠️ REORDER POINT HIT: Stock (${currentStock} ${part.uom || 'EA'}) at/below ROP (${reorderLevel}). Procure ${roq} ${part.uom || 'EA'}.`;
    procurementUrgency = 'HIGH';
    suggestedOrderQty = roq;
  } else if (currentStock > maxStock) {
    procurementStatus = 'OVERSTOCK';
    procurementAction = `📦 OVERSTOCK: Stock (${currentStock} ${part.uom || 'EA'}) exceeds Max (${maxStock}). Defer replenishment.`;
    procurementUrgency = 'NONE';
    suggestedOrderQty = 0;
  } else {
    procurementStatus = 'HEALTHY';
    procurementAction = `✅ HEALTHY: Stock (${currentStock} ${part.uom || 'EA'}) is in optimal buffer band (${minStock}–${maxStock}).`;
    procurementUrgency = 'NONE';
    suggestedOrderQty = 0;
  }

  // 9. Justification
  const reasons = [];
  if (part.excelRank && part.excelRank >= 18) {
    reasons.push(`Plant Score: ${part.excelRank}/25 (Rank 18-25 = Critical)`);
  }
  if (impactScore === 3) reasons.push("Vital line stoppage risk");
  if (leadTimeScore === 3) reasons.push(`Long lead time (${lt !== null ? lt + 'd' : 'N/A'})`);
  if (part.totalConsumed32Mo > 0) reasons.push(`Consumed: ${part.totalConsumed32Mo} ${part.uom || 'EA'} (Avg: ${avgMonthlyUsage}/mo)`);
  if (isStrategic) reasons.push("Strategic capital insurance spare");
  const justification = reasons.length > 0 ? reasons.join(" • ") : "Standard operational replenishment";

  const hasDataIssue = (lt === null || isNaN(lt) || part.excelRisk === 'UNASSESSED' || !part.isEvaluated);

  return {
    ...part,
    leadTimeScore,
    impactScore,
    usageScore,
    compositeScore,
    classification,
    categoryTag,
    isStrategic,
    isOverride,
    hasDataIssue,
    justification,
    // Procurement planning fields
    safetyStock,
    minStock,
    reorderLevel,
    roq,
    maxStock,
    suggestedOrderQty,
    procurementStatus,
    procurementAction,
    procurementUrgency
  };
}

// Recalculate all parts
function recalculateAll() {
  const percentiles = getUsagePercentiles(rawParts);
  scoredParts = rawParts.map(p => scorePart(p, currentConfig, percentiles));
}

// Initialize on server start
recalculateAll();

// 1. GET /api/parts - Filtered & paginated parts list
router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    filter = 'CRITICAL', // 'ALL' | 'CRITICAL' | 'EXCEL_CRITICAL' | 'PROCURE_NOW' | 'CRITICAL_STOCKOUT' | 'REORDER_TRIGGERED' | 'HEALTHY' | 'OVERSTOCK' | 'CONSUMED_SPARES' | 'SEMI-CRITICAL' | 'NON-CRITICAL' | 'STRATEGIC' | 'TOP_20_RISK' | 'UNASSESSED'
    category = '',
    sortBy = 'compositeScore',
    sortDir = 'desc'
  } = req.query;

  let filtered = scoredParts;

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(p =>
      p.partNumber.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.storageLocation && p.storageLocation.toLowerCase().includes(q)) ||
      (p.storageDesc && p.storageDesc.toLowerCase().includes(q)) ||
      (p.equipmentStation && p.equipmentStation.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (category && category !== 'ALL') {
    filtered = filtered.filter(p => p.category === category);
  }

  // Quick Action Filters
  if (filter === 'CRITICAL') {
    filtered = filtered.filter(p => p.categoryTag === 'CRITICAL');
  } else if (filter === 'EXCEL_CRITICAL') {
    filtered = filtered.filter(p => p.excelRisk === 'C');
  } else if (filter === 'PROCURE_NOW') {
    filtered = filtered.filter(p => p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED');
  } else if (filter === 'CRITICAL_PROCURE') {
    // Critical parts needing urgent procurement
    filtered = filtered.filter(p => p.categoryTag === 'CRITICAL' && (p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED'));
  } else if (filter === 'CRITICAL_STOCKOUT') {
    filtered = filtered.filter(p => p.procurementStatus === 'CRITICAL_STOCKOUT');
  } else if (filter === 'REORDER_TRIGGERED') {
    filtered = filtered.filter(p => p.procurementStatus === 'REORDER_TRIGGERED');
  } else if (filter === 'HEALTHY') {
    filtered = filtered.filter(p => p.procurementStatus === 'HEALTHY');
  } else if (filter === 'OVERSTOCK') {
    filtered = filtered.filter(p => p.procurementStatus === 'OVERSTOCK');
  } else if (filter === 'CONSUMED_SPARES') {
    filtered = filtered.filter(p => p.totalConsumed32Mo > 0);
  } else if (filter === 'SEMI-CRITICAL') {
    filtered = filtered.filter(p => p.categoryTag === 'SEMI-CRITICAL');
  } else if (filter === 'NON-CRITICAL') {
    filtered = filtered.filter(p => p.categoryTag === 'NON-CRITICAL');
  } else if (filter === 'STRATEGIC') {
    filtered = filtered.filter(p => p.isStrategic);
  } else if (filter === 'DATA_QUALITY' || filter === 'UNASSESSED') {
    filtered = filtered.filter(p => p.hasDataIssue || p.excelRisk === 'UNASSESSED');
  } else if (filter === 'TOP_20_RISK') {
    filtered = [...scoredParts]
      .filter(p => p.categoryTag === 'CRITICAL')
      .sort((a, b) => (b.excelRank || 0) - (a.excelRank || 0) || b.compositeScore - a.compositeScore || (b.leadTimeDays || 0) - (a.leadTimeDays || 0))
      .slice(0, 20);
  }

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (aVal === null || aVal === undefined) aVal = 0;
    if (bVal === null || bVal === undefined) bVal = 0;

    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const total = sorted.length;
  const p = Math.max(1, parseInt(page, 10));
  const ps = Math.max(1, parseInt(pageSize, 10));
  const startIndex = (p - 1) * ps;
  const paginated = sorted.slice(startIndex, startIndex + ps);

  res.json({
    parts: paginated,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
    activeFilter: filter,
    dataSource: dataSourceName
  });
});

// 2. GET /api/parts/summary - High level metrics, KPI distribution & Procurement Triggers
router.get('/summary', (req, res) => {
  const total = scoredParts.length;
  const critical = scoredParts.filter(p => p.categoryTag === 'CRITICAL');
  const excelCritical = scoredParts.filter(p => p.excelRisk === 'C');
  const semiCritical = scoredParts.filter(p => p.categoryTag === 'SEMI-CRITICAL');
  const nonCritical = scoredParts.filter(p => p.categoryTag === 'NON-CRITICAL');
  const strategic = scoredParts.filter(p => p.isStrategic);
  const dataIssues = scoredParts.filter(p => p.hasDataIssue || p.excelRisk === 'UNASSESSED');

  // Procurement Action Counts
  const stockoutCount = scoredParts.filter(p => p.procurementStatus === 'CRITICAL_STOCKOUT').length;
  const reorderCount = scoredParts.filter(p => p.procurementStatus === 'REORDER_TRIGGERED').length;
  const healthyCount = scoredParts.filter(p => p.procurementStatus === 'HEALTHY').length;
  const overstockCount = scoredParts.filter(p => p.procurementStatus === 'OVERSTOCK').length;

  const critStockoutCount = critical.filter(p => p.procurementStatus === 'CRITICAL_STOCKOUT').length;
  const critReorderCount = critical.filter(p => p.procurementStatus === 'REORDER_TRIGGERED').length;
  const activeConsumedCount = scoredParts.filter(p => p.totalConsumed32Mo > 0).length;

  // Top 20 highest risk spares (Highest Excel score + Vital impact + Long Lead time)
  const top20Risks = [...critical]
    .sort((a, b) => (b.excelRank || 0) - (a.excelRank || 0) || b.compositeScore - a.compositeScore || (b.leadTimeDays || 0) - (a.leadTimeDays || 0))
    .slice(0, 20);

  // Category breakdown
  const categoryBreakdown = {};
  scoredParts.forEach(p => {
    categoryBreakdown[p.category] = categoryBreakdown[p.category] || { total: 0, critical: 0, reorder: 0 };
    categoryBreakdown[p.category].total++;
    if (p.categoryTag === 'CRITICAL') categoryBreakdown[p.category].critical++;
    if (p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED') {
      categoryBreakdown[p.category].reorder++;
    }
  });

  res.json({
    totalParts: total,
    criticalCount: critical.length,
    criticalPct: total > 0 ? Number(((critical.length / total) * 100).toFixed(1)) : 0,
    excelCriticalCount: excelCritical.length,
    excelCriticalPct: total > 0 ? Number(((excelCritical.length / total) * 100).toFixed(1)) : 0,
    semiCriticalCount: semiCritical.length,
    semiCriticalPct: total > 0 ? Number(((semiCritical.length / total) * 100).toFixed(1)) : 0,
    nonCriticalCount: nonCritical.length,
    nonCriticalPct: total > 0 ? Number(((nonCritical.length / total) * 100).toFixed(1)) : 0,
    strategicSparesCount: strategic.length,
    dataQualityIssuesCount: dataIssues.length,
    top20Risks,
    categoryBreakdown,
    currentConfig,
    dataSource: dataSourceName,
    plantInfo: {
      name: "Cab Panel Press Shop (CPPS)",
      owner: "PE Team",
      code: "2003",
      sourceFiles: ["Critical Spare.xlsx", "NPE1 history.xlsx"]
    },
    // Procurement Intelligence
    procurementSummary: {
      actionRequiredTotal: stockoutCount + reorderCount,
      stockoutCount,
      reorderCount,
      healthyCount,
      overstockCount,
      critStockoutCount,
      critReorderCount,
      critActionRequiredTotal: critStockoutCount + critReorderCount,
      activeConsumedCount
    }
  });
});

// 3. POST /api/parts/classify - Update weights & cutoffs and recalculate
router.post('/classify', (req, res) => {
  const {
    impactWeight,
    leadTimeWeight,
    usageWeight,
    criticalCutoff,
    semiCutoff,
    ltHighCutoff,
    ltMedCutoff
  } = req.body;

  if (impactWeight !== undefined) currentConfig.impactWeight = Number(impactWeight);
  if (leadTimeWeight !== undefined) currentConfig.leadTimeWeight = Number(leadTimeWeight);
  if (usageWeight !== undefined) currentConfig.usageWeight = Number(usageWeight);
  if (criticalCutoff !== undefined) currentConfig.criticalCutoff = Number(criticalCutoff);
  if (semiCutoff !== undefined) currentConfig.semiCutoff = Number(semiCutoff);
  if (ltHighCutoff !== undefined) currentConfig.ltHighCutoff = Number(ltHighCutoff);
  if (ltMedCutoff !== undefined) currentConfig.ltMedCutoff = Number(ltMedCutoff);

  recalculateAll();

  res.json({
    success: true,
    message: "Criticality rules and inventory parameters recalculated successfully.",
    config: currentConfig,
    summary: {
      total: scoredParts.length,
      criticalCount: scoredParts.filter(p => p.categoryTag === 'CRITICAL').length,
      semiCount: scoredParts.filter(p => p.categoryTag === 'SEMI-CRITICAL').length,
      nonCriticalCount: scoredParts.filter(p => p.categoryTag === 'NON-CRITICAL').length
    }
  });
});

// 4. GET /api/parts/export - Export to CSV with Inventory Planning & Procurement Parameters
router.get('/export', (req, res) => {
  const { filter = 'ALL' } = req.query;

  let exportList = scoredParts;
  let filename = 'hosur_plant_parts_procurement_plan.csv';

  if (filter === 'CRITICAL') {
    exportList = scoredParts.filter(p => p.categoryTag === 'CRITICAL');
    filename = 'hosur_plant_critical_parts_procurement.csv';
  } else if (filter === 'EXCEL_CRITICAL') {
    exportList = scoredParts.filter(p => p.excelRisk === 'C');
    filename = 'hosur_plant_excel_c_spares_procurement.csv';
  } else if (filter === 'PROCURE_NOW' || filter === 'CRITICAL_STOCKOUT') {
    exportList = scoredParts.filter(p => p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED');
    filename = 'hosur_plant_procurement_indents_required.csv';
  } else if (filter === 'CRITICAL_PROCURE') {
    exportList = scoredParts.filter(p => p.categoryTag === 'CRITICAL' && (p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED'));
    filename = 'hosur_plant_critical_spares_urgent_indents.csv';
  }

  // Headers matching user request
  const headers = [
    'Material_Part_Number',
    'Material_Description',
    'Category',
    'Plant',
    'Storage_Location',
    'Storage_Desc',
    'Current_Stock',
    'Base_UOM',
    'Stock_Value_INR',
    'Total_Consumed_32Mo',
    'Avg_Monthly_Usage',
    'Max_Monthly_Usage',
    'Lead_Time_Days',
    'Lead_Time_Text',
    'Safety_Stock',
    'Minimum_Stock',
    'Reorder_Level_ROL',
    'Reorder_Quantity_ROQ',
    'Maximum_Stock',
    'Suggested_Order_Qty',
    'Procurement_Status',
    'Procurement_Action_Indication',
    'Procurement_Urgency',
    'Plant_Excel_Score_25',
    'Plant_Excel_Risk',
    'Composite_Criticality_Score',
    'Final_Classification',
    'Category_Tag',
    'Justification'
  ];

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '';
    const s = String(str).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const rows = exportList.map(p => [
    escapeCsv(p.partNumber),
    escapeCsv(p.description),
    escapeCsv(p.category),
    p.plant || '2003',
    p.storageLocation || 'NPE1',
    escapeCsv(p.storageDesc || 'MAINTAIN. STORE'),
    p.currentStock ?? 0,
    p.uom || 'EA',
    p.stockValue ?? 0,
    p.totalConsumed32Mo ?? 0,
    p.avgMonthlyUsage ?? 0,
    p.maxMonthlyUsage ?? 0,
    p.leadTimeDays !== null ? p.leadTimeDays : 'N/A',
    escapeCsv(p.leadTimeText || ''),
    p.safetyStock,
    p.minStock,
    p.reorderLevel,
    p.roq,
    p.maxStock,
    p.suggestedOrderQty,
    p.procurementStatus,
    escapeCsv(p.procurementAction),
    p.procurementUrgency,
    p.excelRank || 0,
    p.excelRisk || 'UNASSESSED',
    p.compositeScore,
    escapeCsv(p.classification),
    p.categoryTag,
    escapeCsv(p.justification)
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

// 5. POST /api/parts/reset - Reload genuine plant data
router.post('/reset', (req, res) => {
  loadInitialData();
  recalculateAll();
  res.json({ success: true, message: `Reloaded ${rawParts.length} parts from database.` });
});

module.exports = router;
