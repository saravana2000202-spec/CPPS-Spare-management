const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

console.log('Generating Plant Inventory & Procurement Deliverable Package...');

// Load data
const parts = require('../server/data/imported_parts.json');
console.log(`Loaded ${parts.length} parts from database.`);

// Target directories
const targetDirs = [
  path.join(__dirname, '..', 'Plant_Inventory_Procurement_Package'),
  'C:\\Users\\PS 2\\Desktop\\Plant_Inventory_Procurement_Package'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. Build Multi-Tab Master Excel Workbook
console.log('Creating Excel Master Workbook...');
const wb = XLSX.utils.book_new();

// Tab 1: Summary & KPIs
const summaryRows = [
  ['CAB PANEL PRESS SHOP (CPPS) — PLANT 2003 — NPE1 MAINTAIN. STORE'],
  ['SPARE PARTS INVENTORY OPTIMIZATION & PROCUREMENT ACTION PLAN'],
  ['Owner / Responsible Team', 'PE Team'],
  ['Report Generated', new Date().toLocaleString()],
  [],
  ['--- KEY METRICS & EXECUTIVE KPI DASHBOARD ---', ''],
  ['Total Unique Spare Parts (ZSPR)', parts.length],
  ['Plant Assessed Critical Spares (Rank 18-25, Category C)', parts.filter(p => p.excelRisk === 'C').length],
  ['Plant Assessed Normal Spares (Category NC)', parts.filter(p => p.excelRisk === 'NC').length],
  ['Unassessed Spares (Evaluated by Algorithm)', parts.filter(p => !p.isEvaluated).length],
  ['Active Consumed Spares in NPE1 (April 2024 - November 2026)', parts.filter(p => p.totalConsumed32Mo > 0).length],
  ['Total Consumption Transactions Analyzed', 6658],
  ['Total Quantity Consumed (32 Months)', parts.reduce((acc, p) => acc + (p.totalConsumed32Mo || 0), 0)],
  [],
  ['--- IMMEDIATE PROCUREMENT ALERTS ---', ''],
  ['CRITICAL Spares with Zero Stock / Stockout (URGENT INDENTS)', parts.filter(p => p.excelRisk === 'C' && p.procurementStatus === 'CRITICAL_STOCKOUT').length],
  ['CRITICAL Spares at Reorder Point (REORDER TRIGGERED)', parts.filter(p => p.excelRisk === 'C' && p.procurementStatus === 'REORDER_TRIGGERED').length],
  ['Total CRITICAL Spares Needing Procurement Action', parts.filter(p => p.excelRisk === 'C' && (p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED')).length],
  ['Total Spares Across All Categories Requiring Indent', parts.filter(p => p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED').length],
  ['Overstocked Spares (Excess Capital Lockup)', parts.filter(p => p.procurementStatus === 'OVERSTOCK').length],
  ['Healthy Spares (Within Optimal Range)', parts.filter(p => p.procurementStatus === 'HEALTHY').length],
  [],
  ['--- INVENTORY CALCULATION FORMULAS ASSIGNED ---', ''],
  ['Safety Stock (Buffer)', '(Max Monthly Usage * LT Months) - (Avg Monthly Usage * LT Months) + Lead Time Baseline Floor'],
  ['Minimum Stock', 'Equal to Safety Stock (Zero line-stoppage risk threshold)'],
  ['Reorder Level (ROL / ROP)', '(Avg Monthly Usage * LT Months) + Safety Stock'],
  ['Reorder Quantity (ROQ)', 'Max( Ceil(3 * Avg Monthly Usage), Replenishment Batch Floor (2 for Critical, 1 for Normal) )'],
  ['Maximum Stock', 'Minimum Stock + Reorder Quantity (ROQ)'],
  ['Procurement Trigger - CRITICAL_STOCKOUT', 'Current Stock < Safety Stock (Or 0 On-Hand). Raise immediate PR.'],
  ['Procurement Trigger - REORDER_TRIGGERED', 'Safety Stock <= Current Stock <= Reorder Level. Procure assigned ROQ.'],
  ['Procurement Trigger - HEALTHY', 'Reorder Level < Current Stock <= Max Stock. Stock is optimal.'],
  ['Procurement Trigger - OVERSTOCK', 'Current Stock > Max Stock. Excess stock, postpone purchasing.']
];
const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
wsSummary['!cols'] = [{ wch: 45 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wb, wsSummary, '01_Summary_KPI');

// Helper to format part rows
function formatPartRow(p) {
  return {
    'Part Number': p.partNumber,
    'Description': p.description,
    'Category': p.category,
    'Plant': p.plant,
    'Storage Loc': p.storageLocation,
    'UoM': p.uom,
    'Current Stock': p.currentStock,
    'Safety Stock': p.safetyStock,
    'Min Stock': p.minStock,
    'Reorder Level (ROL)': p.reorderLevel,
    'Reorder Qty (ROQ)': p.roq,
    'Max Stock': p.maxStock,
    'Suggested Order Qty': p.suggestedOrderQty,
    'Procurement Status': p.procurementStatus,
    'Procurement Action / Indication': p.procurementAction,
    'Urgency Level': p.procurementUrgency,
    '32-Mo Consumed': p.totalConsumed32Mo,
    'Avg Monthly Usage': p.avgMonthlyUsage,
    'Max Monthly Usage': p.maxMonthlyUsage,
    'SAP Tx Count': p.txCount,
    'Last Consumed Date': p.lastConsumedDate || 'None',
    'Lead Time (Days)': p.leadTimeDays,
    'Lead Time Bracket': p.leadTimeText,
    'Plant Risk Score (1-25)': p.excelRank || '',
    'Plant Risk Category': p.excelRisk || 'UNASSESSED',
    'Impact Level': p.downtimeImpactLevel,
    'Unit Cost (Est INR)': p.unitCostUSD
  };
}

// Tab 2: Urgent Procurement Indents (Critical Spares with stockout or reorder)
console.log('Generating Urgent Indents sheet...');
const urgentCriticalParts = parts.filter(p => 
  p.excelRisk === 'C' && (p.procurementStatus === 'CRITICAL_STOCKOUT' || p.procurementStatus === 'REORDER_TRIGGERED')
);
const wsUrgent = XLSX.utils.json_to_sheet(urgentCriticalParts.map(formatPartRow));
wsUrgent['!cols'] = [
  { wch: 22 }, { wch: 42 }, { wch: 26 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
  { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
  { wch: 18 }, { wch: 22 }, { wch: 55 }, { wch: 14 }, { wch: 15 }, { wch: 16 },
  { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 16 }, { wch: 20 },
  { wch: 18 }, { wch: 14 }, { wch: 14 }
];
XLSX.utils.book_append_sheet(wb, wsUrgent, '02_Urgent_Critical_Indents');

// Tab 3: Critical Spares Master (All 751 Critical Spares)
console.log('Generating Critical Spares Master sheet...');
const criticalParts = parts.filter(p => p.excelRisk === 'C');
const wsCritical = XLSX.utils.json_to_sheet(criticalParts.map(formatPartRow));
wsCritical['!cols'] = wsUrgent['!cols'];
XLSX.utils.book_append_sheet(wb, wsCritical, '03_Critical_Spares_Master');

// Tab 4: All 7,340 Parts Master
console.log('Generating All 7,340 Parts Master sheet...');
const wsAll = XLSX.utils.json_to_sheet(parts.map(formatPartRow));
wsAll['!cols'] = wsUrgent['!cols'];
XLSX.utils.book_append_sheet(wb, wsAll, '04_All_7340_Parts_Master');

// Tab 5: 32-Month Consumption Analysis
console.log('Generating 32-Month Consumption sheet...');
const consumedParts = parts
  .filter(p => p.totalConsumed32Mo > 0)
  .sort((a, b) => b.totalConsumed32Mo - a.totalConsumed32Mo)
  .map(p => ({
    'Part Number': p.partNumber,
    'Description': p.description,
    'Category': p.category,
    'Plant Risk': p.excelRisk,
    'Total 32-Mo Consumed': p.totalConsumed32Mo,
    'Avg Monthly Usage': p.avgMonthlyUsage,
    'Peak Monthly Usage': p.maxMonthlyUsage,
    'Issue Transactions': p.txCount,
    'Last Consumed Date': p.lastConsumedDate,
    'Current Stock': p.currentStock,
    'Safety Stock': p.safetyStock,
    'Reorder Level (ROL)': p.reorderLevel,
    'Reorder Qty (ROQ)': p.roq,
    'Procurement Status': p.procurementStatus,
    'Lead Time (Days)': p.leadTimeDays
  }));
const wsConsumed = XLSX.utils.json_to_sheet(consumedParts);
wsConsumed['!cols'] = [
  { wch: 22 }, { wch: 42 }, { wch: 26 }, { wch: 12 }, { wch: 18 },
  { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
  { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 15 }
];
XLSX.utils.book_append_sheet(wb, wsConsumed, '05_32Mo_Consumption_Analytics');

// Save Excel workbook to both folders
targetDirs.forEach(dir => {
  const excelPath = path.join(dir, 'Plant_Inventory_Master_Analysis.xlsx');
  XLSX.writeFile(wb, excelPath);
  console.log(`Saved Excel workbook to: ${excelPath}`);
});

// 2. Generate Clean CSV Files for SAP & Procurement Teams
console.log('Generating CSV export files...');
function toCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const lines = [headers.map(h => `"${h}"`).join(',')];
  data.forEach(row => {
    lines.push(headers.map(h => {
      const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(','));
  });
  return lines.join('\r\n');
}

const csvFiles = [
  {
    name: '01_Urgent_Procurement_Indents_SAP.csv',
    data: urgentCriticalParts.map(formatPartRow)
  },
  {
    name: '02_Critical_Spares_Inventory_Levels.csv',
    data: criticalParts.map(formatPartRow)
  },
  {
    name: '03_All_7340_Parts_Inventory_Master.csv',
    data: parts.map(formatPartRow)
  },
  {
    name: '04_NPE1_32Month_Consumption_Summary.csv',
    data: consumedParts
  }
];

csvFiles.forEach(file => {
  const csvContent = toCSV(file.data);
  targetDirs.forEach(dir => {
    const csvPath = path.join(dir, file.name);
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`Saved CSV to: ${csvPath}`);
  });
});

// 3. Generate Standalone Offline HTML Application
console.log('Building Standalone Offline Interactive HTML Dashboard...');

// Prepare JSON payload with sanitized fields for lightweight fast browser rendering
const clientPayload = parts.map(p => ({
  pn: p.partNumber,
  de: p.description,
  ca: p.category,
  st: p.currentStock,
  ss: p.safetyStock,
  ms: p.minStock,
  rl: p.reorderLevel,
  rq: p.roq,
  xs: p.maxStock,
  so: p.suggestedOrderQty,
  ps: p.procurementStatus,
  pa: p.procurementAction,
  pu: p.procurementUrgency,
  tc: p.totalConsumed32Mo,
  au: p.avgMonthlyUsage,
  mu: p.maxMonthlyUsage,
  tx: p.txCount,
  ld: p.lastConsumedDate,
  lt: p.leadTimeDays,
  lx: p.leadTimeText,
  er: p.excelRisk || 'UNASSESSED',
  rk: p.excelRank || 0,
  uom: p.uom,
  loc: p.storageLocation
}));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cab Panel Press Shop (CPPS) — Spare Parts Inventory & Procurement Optimizer</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 20px; line-height: 1.5; }
    .header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .title { font-size: 24px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
    .badge-plant { background: #1e3a8a; color: #93c5fd; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    
    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 16px; transition: transform 0.2s; cursor: pointer; }
    .kpi-card:hover { transform: translateY(-2px); border-color: var(--primary); }
    .kpi-card.active { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.4); }
    .kpi-title { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .kpi-sub { font-size: 12px; margin-top: 4px; color: var(--text-muted); }
    
    /* Filter Bar */
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; align-items: center; justify-content: space-between; }
    .search-box { flex: 1; min-width: 280px; position: relative; }
    .search-input { width: 100%; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 14px; outline: none; }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
    .filter-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { background: var(--card-bg); border: 1px solid var(--border); color: var(--text-muted); padding: 8px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .pill:hover { color: #fff; border-color: #64748b; }
    .pill.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .pill.pill-danger.active { background: var(--danger); border-color: var(--danger); }
    .pill.pill-warning.active { background: var(--warning); border-color: var(--warning); color: #000; }
    
    .btn-export { background: #059669; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-export:hover { background: #10b981; }

    /* Table */
    .table-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; overflow-x: auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: #1e293b; padding: 12px 14px; font-weight: 600; color: #94a3b8; border-bottom: 1px solid var(--border); position: sticky; top: 0; white-space: nowrap; }
    td { padding: 10px 14px; border-bottom: 1px solid #293548; white-space: nowrap; vertical-align: middle; }
    tr:hover td { background-color: #243248; cursor: pointer; }
    
    .pn-cell { font-family: monospace; font-weight: 600; color: #60a5fa; }
    .desc-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e2e8f0; }
    
    /* Badges */
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-stockout { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-reorder { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-healthy { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-overstock { background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.4); }
    .badge-crit { background: #991b1b; color: #fecaca; }
    .badge-norm { background: #334155; color: #cbd5e1; }

    /* Modal */
    .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 50; justify-content: center; align-items: center; padding: 20px; }
    .modal-card { background: #1e293b; border: 1px solid #475569; border-radius: 12px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; padding: 24px; position: relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }
    .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
    .modal-stat { background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
    .modal-stat-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
    .modal-stat-val { font-size: 18px; font-weight: 700; color: #fff; margin-top: 4px; }
    
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; color: var(--text-muted); font-size: 13px; }
    .btn-page { background: var(--card-bg); border: 1px solid var(--border); color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <h1 class="title">Cab Panel Press Shop (CPPS) — Spare Parts Inventory &amp; Procurement Optimizer</h1>
        <span class="badge-plant">Plant 2003 • NPE1 • Owner: PE Team</span>
      </div>
      <p class="subtitle">Dynamic Safety Stock, Min/Max Levels, Reorder Points &amp; Procurement Indication based on 32-Month NPE1 Consumption History</p>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn-export" onclick="exportFilteredCSV()">📥 Export Current View to CSV</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card" onclick="setFilter('ALL')" id="kpi-all">
      <div class="kpi-title">Total Plant Spares</div>
      <div class="kpi-value" style="color: #60a5fa;" id="val-total">7,340</div>
      <div class="kpi-sub">Plant 2003 ZSPR catalog</div>
    </div>
    <div class="kpi-card" onclick="setFilter('CRIT_STOCKOUT')" id="kpi-stockout">
      <div class="kpi-title">🚨 Urgent Indents (Critical)</div>
      <div class="kpi-value" style="color: #f87171;" id="val-stockout">658</div>
      <div class="kpi-sub">Critical parts below safety stock</div>
    </div>
    <div class="kpi-card" onclick="setFilter('REORDER')" id="kpi-reorder">
      <div class="kpi-title">⚠️ Reorder Triggered</div>
      <div class="kpi-value" style="color: #fbbf24;" id="val-reorder">173</div>
      <div class="kpi-sub">Stock at or below ROP</div>
    </div>
    <div class="kpi-card" onclick="setFilter('EXCEL_CRIT')" id="kpi-crit">
      <div class="kpi-title">Critical Spares (Plant List)</div>
      <div class="kpi-value" style="color: #f43f5e;" id="val-crit">751</div>
      <div class="kpi-sub">Rank 18-25 / 25 in Excel</div>
    </div>
    <div class="kpi-card" onclick="setFilter('CONSUMED')" id="kpi-consumed">
      <div class="kpi-title">32-Mo Consumed Spares</div>
      <div class="kpi-value" style="color: #a78bfa;" id="val-consumed">1,294</div>
      <div class="kpi-sub">6,658 transactions analyzed</div>
    </div>
    <div class="kpi-card" onclick="setFilter('HEALTHY')" id="kpi-healthy">
      <div class="kpi-title">✅ Healthy Stock</div>
      <div class="kpi-value" style="color: #34d399;" id="val-healthy">178</div>
      <div class="kpi-sub">Within optimal range</div>
    </div>
    <div class="kpi-card" onclick="setFilter('OVERSTOCK')" id="kpi-overstock">
      <div class="kpi-title">📦 Overstock</div>
      <div class="kpi-value" style="color: #c084fc;" id="val-overstock">785</div>
      <div class="kpi-sub">Above max ceiling</div>
    </div>
  </div>

  <!-- Filter & Search Toolbar -->
  <div class="toolbar">
    <div class="filter-pills">
      <button class="pill active" id="btn-ALL" onclick="setFilter('ALL')">All Spares (7,340)</button>
      <button class="pill pill-danger" id="btn-CRIT_STOCKOUT" onclick="setFilter('CRIT_STOCKOUT')">🚨 Urgent Indents (658)</button>
      <button class="pill pill-warning" id="btn-REORDER" onclick="setFilter('REORDER')">⚠️ Reorder Hit (173)</button>
      <button class="pill" id="btn-EXCEL_CRIT" onclick="setFilter('EXCEL_CRIT')">Critical Spares (751)</button>
      <button class="pill" id="btn-CONSUMED" onclick="setFilter('CONSUMED')">32-Mo Consumed (1,294)</button>
      <button class="pill" id="btn-HEALTHY" onclick="setFilter('HEALTHY')">✅ Healthy Stock (178)</button>
      <button class="pill" id="btn-OVERSTOCK" onclick="setFilter('OVERSTOCK')">📦 Overstock (785)</button>
    </div>
    <div class="search-box">
      <input type="text" class="search-input" id="search" placeholder="🔍 Search Part Number, Description, or Category..." oninput="handleSearch()">
    </div>
  </div>

  <!-- Table View -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Part Number</th>
          <th>Description</th>
          <th>Category</th>
          <th>Risk</th>
          <th>Stock</th>
          <th>Safety (Min)</th>
          <th>Reorder Level</th>
          <th>ROQ</th>
          <th>Max Stock</th>
          <th>32-Mo Consumed</th>
          <th>Procurement Status</th>
          <th>Suggested Order</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="table-body">
        <!-- Rendered by JS -->
      </tbody>
    </table>
    <div class="pagination">
      <span id="page-info">Showing 1 to 50 of 7,340 parts</span>
      <div style="display: flex; gap: 8px;">
        <button class="btn-page" id="btn-prev" onclick="prevPage()">Previous</button>
        <button class="btn-page" id="btn-next" onclick="nextPage()">Next</button>
      </div>
    </div>
  </div>

  <!-- Part Inspection Modal -->
  <div class="modal-backdrop" id="modal" onclick="closeModal(event)">
    <div class="modal-card" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <div style="display: flex; align-items: center; gap: 10px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #fff;" id="m-pn">Part Number</h2>
        <span id="m-badge"></span>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;" id="m-desc">Description</p>
      
      <div style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 8px;">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #60a5fa;">Procurement Guidance</div>
        <div style="font-size: 14px; font-weight: 600; margin-top: 4px;" id="m-action">Action required here</div>
      </div>

      <div class="modal-grid">
        <div class="modal-stat">
          <div class="modal-stat-title">Current On-Hand Stock</div>
          <div class="modal-stat-val" style="color: #38bdf8;" id="m-stock">0 EA</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-title">Suggested Order Quantity</div>
          <div class="modal-stat-val" style="color: #f87171;" id="m-so">0 EA</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-title">Safety Stock (Buffer)</div>
          <div class="modal-stat-val" id="m-ss">0 EA</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-title">Reorder Level (ROL)</div>
          <div class="modal-stat-val" id="m-rl">0 EA</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-title">Reorder Quantity (ROQ)</div>
          <div class="modal-stat-val" id="m-rq">0 EA</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-title">Maximum Stock Ceiling</div>
          <div class="modal-stat-val" id="m-xs">0 EA</div>
        </div>
      </div>

      <div style="margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px;">
        <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #cbd5e1;">32-Month NPE1 Consumption Profile</h3>
        <div class="modal-grid">
          <div class="modal-stat">
            <div class="modal-stat-title">Total Consumed (2024–2026)</div>
            <div class="modal-stat-val" style="color: #a78bfa;" id="m-tc">0 EA</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-title">Monthly Average Consumption</div>
            <div class="modal-stat-val" id="m-au">0 EA/mo</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-title">Peak Monthly Consumption</div>
            <div class="modal-stat-val" id="m-mu">0 EA</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-title">SAP Issue Transactions</div>
            <div class="modal-stat-val" id="m-tx">0 times</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-title">Procurement Lead Time</div>
            <div class="modal-stat-val" id="m-lt">120 Days</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-title">Plant Criticality Rank</div>
            <div class="modal-stat-val" id="m-rk">22 / 25</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Embedded real plant dataset
    const ALL_PARTS = ${JSON.stringify(clientPayload)};

    let currentFilter = 'ALL';
    let searchQuery = '';
    let currentPage = 1;
    const pageSize = 50;
    let filteredParts = [...ALL_PARTS];

    function applyFilters() {
      filteredParts = ALL_PARTS.filter(p => {
        // Status filter
        if (currentFilter === 'CRIT_STOCKOUT') {
          if (!(p.er === 'C' && p.ps === 'CRITICAL_STOCKOUT')) return false;
        } else if (currentFilter === 'REORDER') {
          if (p.ps !== 'REORDER_TRIGGERED') return false;
        } else if (currentFilter === 'EXCEL_CRIT') {
          if (p.er !== 'C') return false;
        } else if (currentFilter === 'CONSUMED') {
          if (!p.tc || p.tc <= 0) return false;
        } else if (currentFilter === 'HEALTHY') {
          if (p.ps !== 'HEALTHY') return false;
        } else if (currentFilter === 'OVERSTOCK') {
          if (p.ps !== 'OVERSTOCK') return false;
        }

        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchPn = p.pn.toLowerCase().includes(q);
          const matchDe = p.de.toLowerCase().includes(q);
          const matchCa = p.ca.toLowerCase().includes(q);
          if (!matchPn && !matchDe && !matchCa) return false;
        }

        return true;
      });

      currentPage = 1;
      renderTable();
    }

    function setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('btn-' + filter);
      if (activeBtn) activeBtn.classList.add('active');

      document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
      if (filter === 'ALL') document.getElementById('kpi-all').classList.add('active');
      if (filter === 'CRIT_STOCKOUT') document.getElementById('kpi-stockout').classList.add('active');
      if (filter === 'REORDER') document.getElementById('kpi-reorder').classList.add('active');
      if (filter === 'EXCEL_CRIT') document.getElementById('kpi-crit').classList.add('active');
      if (filter === 'CONSUMED') document.getElementById('kpi-consumed').classList.add('active');
      if (filter === 'HEALTHY') document.getElementById('kpi-healthy').classList.add('active');
      if (filter === 'OVERSTOCK') document.getElementById('kpi-overstock').classList.add('active');

      applyFilters();
    }

    function handleSearch() {
      searchQuery = document.getElementById('search').value.trim();
      applyFilters();
    }

    function renderTable() {
      const tbody = document.getElementById('table-body');
      tbody.innerHTML = '';

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const pageItems = filteredParts.slice(start, end);

      pageItems.forEach(p => {
        const tr = document.createElement('tr');
        tr.onclick = () => openModal(p);

        let statusBadge = '';
        if (p.ps === 'CRITICAL_STOCKOUT') {
          statusBadge = '<span class="badge badge-stockout">🚨 Stockout (' + p.pu + ')</span>';
        } else if (p.ps === 'REORDER_TRIGGERED') {
          statusBadge = '<span class="badge badge-reorder">⚠️ Reorder Triggered</span>';
        } else if (p.ps === 'HEALTHY') {
          statusBadge = '<span class="badge badge-healthy">✅ Healthy</span>';
        } else {
          statusBadge = '<span class="badge badge-overstock">📦 Overstock</span>';
        }

        const riskBadge = p.er === 'C' 
          ? '<span class="badge badge-crit">C (' + p.rk + ')</span>' 
          : '<span class="badge badge-norm">NC</span>';

        tr.innerHTML = 
          '<td class="pn-cell">' + p.pn + '</td>' +
          '<td class="desc-cell" title="' + p.de + '">' + p.de + '</td>' +
          '<td>' + p.ca + '</td>' +
          '<td>' + riskBadge + '</td>' +
          '<td style="font-weight: 700; ' + (p.st <= p.ss ? 'color: #f87171;' : '') + '">' + p.st + '</td>' +
          '<td style="color: #60a5fa; font-weight: 600;">' + p.ss + '</td>' +
          '<td style="color: #fbbf24; font-weight: 600;">' + p.rl + '</td>' +
          '<td>' + p.rq + '</td>' +
          '<td>' + p.xs + '</td>' +
          '<td style="color: #a78bfa; font-weight: 600;">' + (p.tc || 0) + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td style="font-weight: 700; color: ' + (p.so > 0 ? '#f87171' : '#94a3b8') + ';">' + (p.so > 0 ? '+' + p.so : '0') + ' ' + p.uom + '</td>' +
          '<td><button style="background: #334155; border: none; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Inspect</button></td>';
        
        tbody.appendChild(tr);
      });

      // Pagination info
      const total = filteredParts.length;
      const curStart = total === 0 ? 0 : start + 1;
      const curEnd = Math.min(end, total);
      document.getElementById('page-info').textContent = 'Showing ' + curStart + ' to ' + curEnd + ' of ' + total.toLocaleString() + ' parts';
      document.getElementById('btn-prev').disabled = currentPage <= 1;
      document.getElementById('btn-next').disabled = end >= total;
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    }

    function nextPage() {
      if ((currentPage * pageSize) < filteredParts.length) {
        currentPage++;
        renderTable();
      }
    }

    function openModal(p) {
      document.getElementById('m-pn').textContent = p.pn;
      document.getElementById('m-desc').textContent = p.de;
      document.getElementById('m-action').textContent = p.pa;
      document.getElementById('m-stock').textContent = p.st + ' ' + p.uom;
      document.getElementById('m-so').textContent = p.so + ' ' + p.uom;
      document.getElementById('m-ss').textContent = p.ss + ' ' + p.uom;
      document.getElementById('m-rl').textContent = p.rl + ' ' + p.uom;
      document.getElementById('m-rq').textContent = p.rq + ' ' + p.uom;
      document.getElementById('m-xs').textContent = p.xs + ' ' + p.uom;
      document.getElementById('m-tc').textContent = (p.tc || 0) + ' ' + p.uom;
      document.getElementById('m-au').textContent = (p.au || 0) + ' ' + p.uom + '/mo';
      document.getElementById('m-mu').textContent = (p.mu || 0) + ' ' + p.uom + ' max';
      document.getElementById('m-tx').textContent = (p.tx || 0) + ' transactions';
      document.getElementById('m-lt').textContent = p.lt + ' Days (' + p.lx + ')';
      document.getElementById('m-rk').textContent = (p.rk ? p.rk + ' / 25' : 'Unassessed') + ' (' + p.er + ')';

      const badgeElem = document.getElementById('m-badge');
      if (p.er === 'C') {
        badgeElem.className = 'badge badge-crit';
        badgeElem.textContent = 'Critical Part';
      } else {
        badgeElem.className = 'badge badge-norm';
        badgeElem.textContent = 'Normal Spare';
      }

      document.getElementById('modal').style.display = 'flex';
    }

    function closeModal(e) {
      document.getElementById('modal').style.display = 'none';
    }

    function exportFilteredCSV() {
      const headers = ['Part Number', 'Description', 'Category', 'Current Stock', 'Safety Stock', 'Reorder Level', 'ROQ', 'Max Stock', 'Suggested Order Qty', 'Procurement Status', '32Mo Consumed', 'Lead Time Days', 'Plant Risk'];
      const rows = [headers.join(',')];

      filteredParts.forEach(p => {
        const row = [
          '"' + p.pn + '"',
          '"' + p.de.replace(/"/g, '""') + '"',
          '"' + p.ca + '"',
          p.st,
          p.ss,
          p.rl,
          p.rq,
          p.xs,
          p.so,
          '"' + p.ps + '"',
          p.tc || 0,
          p.lt,
          '"' + p.er + '"'
        ];
        rows.push(row.join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', 'Hosur_Plant_Parts_Export_' + currentFilter + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Initialize
    applyFilters();
  </script>
</body>
</html>`;

targetDirs.forEach(dir => {
  const htmlPath = path.join(dir, 'Interactive_Inventory_Dashboard.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`Saved Standalone Offline HTML Dashboard to: ${htmlPath}`);
});

// 4. Generate Double-Click Batch Launchers
console.log('Generating Double-Click Batch Launchers...');

const batOpenDashboard = `@echo off
echo Opening Hosur Plant Spare Parts Inventory & Procurement Dashboard...
start "" "%~dp0Interactive_Inventory_Dashboard.html"
exit
`;

const batOpenExcel = `@echo off
echo Opening Hosur Plant Inventory Master Analysis Excel Workbook...
start "" "%~dp0Plant_Inventory_Master_Analysis.xlsx"
exit
`;

targetDirs.forEach(dir => {
  fs.writeFileSync(path.join(dir, '01_Open_Interactive_Dashboard.bat'), batOpenDashboard, 'utf8');
  fs.writeFileSync(path.join(dir, '02_Open_Excel_Workbook.bat'), batOpenExcel, 'utf8');
});

// 5. Generate Comprehensive README Instructions
console.log('Generating README documentation...');
const readmeContent = `========================================================================================
CAB PANEL PRESS SHOP (CPPS) — PLANT 2003 — MAINTAIN. STORE (NPE1)
OWNER / RESPONSIBLE TEAM: PE Team
SPARE PARTS INVENTORY OPTIMIZATION & PROCUREMENT ACTION PACKAGE
========================================================================================

This package contains the complete inventory analysis, safety stocks, minimum/maximum
levels, reorder points (ROL), reorder quantities (ROQ), and procurement indications for
all 7,340 plant spare parts, calculated from 32 months of SAP consumption history.

----------------------------------------------------------------------------------------
FOLDER CONTENTS:
----------------------------------------------------------------------------------------

1. Interactive_Inventory_Dashboard.html  [STANDALONE OFFLINE DASHBOARD]
   - Double-click to open in Google Chrome, Microsoft Edge, or any web browser!
   - 100% OFFLINE: Requires NO web server, NO Node.js, and NO internet connection.
   - Interactive search, 1-click filters (Urgent Indents, Reorder Point Hit, Critical Spares),
     modal inspection for all 7,340 parts, and 1-click CSV export.

2. Plant_Inventory_Master_Analysis.xlsx  [EXCEL WORKBOOK WITH 5 SHEETS]
   - Sheet 1: 01_Summary_KPI (Executive stats, formula breakdown, risk overview)
   - Sheet 2: 02_Urgent_Critical_Indents (668 high-priority critical parts needing indents)
   - Sheet 3: 03_Critical_Spares_Master (The 751 critical spares from plant risk evaluation)
   - Sheet 4: 04_All_7340_Parts_Master (Full plant spares catalog with all assigned metrics)
   - Sheet 5: 05_32Mo_Consumption_Analytics (1,294 parts with NPE1 issue transaction history)

3. 01_Urgent_Procurement_Indents_SAP.csv
   - Ready-to-import CSV for SAP Purchase Requisitions / Indent creation.
   - Contains part numbers, descriptions, required order quantities, and plant urgency.

4. 02_Critical_Spares_Inventory_Levels.csv
   - Isolated list of all 751 Critical ('C') Spares with complete inventory parameters.

5. 03_All_7340_Parts_Inventory_Master.csv
   - Complete inventory master dataset for all 7,340 parts in Plant 2003.

6. 04_NPE1_32Month_Consumption_Summary.csv
   - Full 32-month issue history (total consumed, monthly average, monthly peak).

7. 01_Open_Interactive_Dashboard.bat
   - Double-click this batch file to immediately launch the dashboard in your default browser.

8. 02_Open_Excel_Workbook.bat
   - Double-click this batch file to immediately open the Excel analysis in Microsoft Excel.

----------------------------------------------------------------------------------------
INVENTORY OPTIMIZATION FORMULAS IMPLEMENTED:
----------------------------------------------------------------------------------------

1. Safety Stock (Buffer Stock):
   Safety Stock = (Max Monthly Usage * LT Months) - (Avg Monthly Usage * LT Months)
   * Lead Time Floor Rules for Insurance/Strategic Spares:
     - Lead time > 3 months or Vital Impact: 4 to 5 units
     - Lead time 2 to 3 months: 3 units
     - Lead time 1 to 2 months: 2 units
     - Lead time < 1 month: 1 unit

2. Minimum Stock:
   Minimum Stock = Safety Stock
   (Stock dropping below this level incurs immediate line-stoppage risk)

3. Reorder Level (ROL / ROP):
   Reorder Level = (Avg Monthly Usage * LT Months) + Safety Stock
   (Automatic trigger point to raise a purchase indent)

4. Reorder Quantity (ROQ):
   ROQ = Max( Ceil(3 * Avg Monthly Usage), Replenishment Floor (2 for Critical, 1 for Normal) )
   (Standard economic batch replenishment quantity)

5. Maximum Stock:
   Maximum Stock = Minimum Stock + ROQ
   (Upper storage ceiling to avoid excess capital lockup)

----------------------------------------------------------------------------------------
PROCUREMENT STATUS TRIGGERS:
----------------------------------------------------------------------------------------
- CRITICAL_STOCKOUT : Current Stock < Safety Stock (or 0 On-Hand).
                      Action: Raise urgent Purchase Requisition immediately!
- REORDER_TRIGGERED : Safety Stock <= Current Stock <= Reorder Level.
                      Action: Stock has reached reorder point. Procure ROQ.
- HEALTHY           : Reorder Level < Current Stock <= Max Stock.
                      Action: Optimal inventory level. No purchasing required.
- OVERSTOCK         : Current Stock > Max Stock.
                      Action: Surplus inventory. Defer orders to release working capital.

----------------------------------------------------------------------------------------
PLANT SUMMARY STATS — CAB PANEL PRESS SHOP (CPPS) — PLANT 2003 (NPE1) | Owner: PE Team
----------------------------------------------------------------------------------------
- Total Spare Parts Evaluated        : 7,340
- Plant-Assessed Critical Spares     : 751
- Active Consumed Spares (32 Months) : 1,294 (6,658 SAP issue transactions)
- Immediate Critical Indents Needed  : 668 parts (658 stockouts + 10 reorder triggers)
- Overstocked Parts                  : 785 parts
- Optimal Healthy Stock Parts        : 178 parts
========================================================================================
`;

targetDirs.forEach(dir => {
  fs.writeFileSync(path.join(dir, 'README.txt'), readmeContent, 'utf8');
  fs.writeFileSync(path.join(dir, 'README.md'), readmeContent, 'utf8');
});

console.log('All files created successfully in both target folders!');
