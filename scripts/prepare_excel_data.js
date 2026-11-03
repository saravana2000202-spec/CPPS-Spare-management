// scripts/prepare_excel_data.js - Process Critical Spare.xlsx into unified plant inventory data
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'C:/Users/PS 2/Downloads/Critical Spare.xlsx';
console.log('Reading:', filePath);
const wb = XLSX.readFile(filePath);

const finalList = XLSX.utils.sheet_to_json(wb.Sheets['Final List']);
const masterList = XLSX.utils.sheet_to_json(wb.Sheets['Master']);

console.log(`Loaded ${finalList.length} rows from Final List`);
console.log(`Loaded ${masterList.length} rows from Master`);

// Map master data by Material
const masterMap = new Map();
masterList.forEach(row => {
  const mat = String(row['Material'] || '').trim();
  if (mat) {
    if (!masterMap.has(mat)) {
      masterMap.set(mat, row);
    }
  }
});

// Map final list evaluations by Material
const finalMap = new Map();
finalList.forEach(row => {
  const mat = String(row['Material'] || '').trim();
  if (mat) {
    finalMap.set(mat, row);
  }
});

// Convert a row into our rich plant part model
function processSpare(matId, finalRow, masterRow) {
  const desc = (finalRow && finalRow['Material Description']) || 
               (masterRow && masterRow['Material Description']) || 
               'Industrial Spare Part';

  const plant = (masterRow && masterRow['Plant']) || '2003';
  const plantName = (masterRow && masterRow['Name 1']) || 'HOSUR CPPS MFG. PLANT';
  const storageLoc = (masterRow && masterRow['Storage Location']) || 'NPE1';
  const storageDesc = (masterRow && masterRow['Descr. of Storage Loc.']) || 'MAINTAIN. STORE';
  const matGroup = (masterRow && masterRow['Material Group']) || 'NM03';
  const matType = (masterRow && masterRow['Material Type']) || 'ZSPR';
  const uom = (masterRow && masterRow['Base Unit of Measure']) || 'EA';
  const currentStock = Number((finalRow && finalRow['Current stock']) ?? (masterRow && masterRow['Unrestricted']) ?? 0);
  const stockValue = Number((finalRow && finalRow['Value ']) ?? (finalRow && finalRow['Value']) ?? (masterRow && masterRow['Value Unrestricted']) ?? 0);

  // If evaluated in Final List
  let prodImpactRank = finalRow ? Number(finalRow['Production impact if part fails'] || 1) : null;
  let safetyRank = finalRow ? Number(finalRow['Safety '] || finalRow['Safety'] || 1) : null;
  let leadTimeRank = finalRow ? Number(finalRow['Lead time to procure'] || 1) : null;
  let localMarketRank = finalRow ? Number(finalRow['Availability in local market'] || 1) : null;
  let substituteRank = finalRow ? Number(finalRow['Availability of alternative/\r\nsubstitute'] || finalRow['Availability of alternative/substitute'] || 1) : null;
  let excelRank = finalRow ? Number(finalRow['Rank'] || 0) : null;
  let excelRisk = finalRow ? String(finalRow['Risk'] || finalRow['Risk '] || 'NC').trim().toUpperCase() : null;

  // Derive Lead Time Days from Lead Time Rank (1 to 5)
  // 1: <1 wk (5d), 2: 1-2 wks (14d), 3: 2-4 wks (28d), 4: 1-3 mo (60d), 5: >3 mo (90-120d)
  let leadTimeDays = 14;
  let leadTimeText = '1-2 weeks';
  if (leadTimeRank === 1) { leadTimeDays = 5; leadTimeText = '< 1 week'; }
  else if (leadTimeRank === 2) { leadTimeDays = 14; leadTimeText = '1–2 weeks'; }
  else if (leadTimeRank === 3) { leadTimeDays = 28; leadTimeText = '2–4 weeks'; }
  else if (leadTimeRank === 4) { leadTimeDays = 60; leadTimeText = '1–3 months'; }
  else if (leadTimeRank === 5) { leadTimeDays = 120; leadTimeText = '> 3 months'; }
  else {
    leadTimeDays = 30; leadTimeText = 'Standard (30d)';
  }

  // Derive VED Impact level
  let downtimeImpactLevel = 'Desirable';
  if (prodImpactRank >= 4 || safetyRank >= 4) {
    downtimeImpactLevel = 'Vital';
  } else if (prodImpactRank === 3 || safetyRank === 3) {
    downtimeImpactLevel = 'Essential';
  } else if (prodImpactRank) {
    downtimeImpactLevel = 'Desirable';
  } else {
    downtimeImpactLevel = 'Assessment Pending';
  }

  // Determine Criticality Category from Excel
  // In Excel Category sheet: Score 18-25 = 'Critical Spare', Below 17 = 'Normal Spare'
  let isExcelCritical = (excelRisk === 'C' || (excelRank && excelRank >= 18));
  let categoryTag = isExcelCritical ? 'CRITICAL' : 'NON-CRITICAL';
  if (finalRow && !isExcelCritical && excelRank >= 14) {
    categoryTag = 'SEMI-CRITICAL';
  }

  // Safety stock rule from Category sheet
  let recSafetyStock = '1 unit';
  if (leadTimeDays > 90) recSafetyStock = '4–5 units';
  else if (leadTimeDays >= 60) recSafetyStock = '3 units';
  else if (leadTimeDays >= 28) recSafetyStock = '2 units';
  else recSafetyStock = '1 unit';

  // Category inference from Description
  let category = 'Mechanical & Spares';
  const uDesc = desc.toUpperCase();
  if (uDesc.includes('BEARING') || uDesc.includes('GEAR') || uDesc.includes('SHAFT') || uDesc.includes('COUPLING') || uDesc.includes('PULLEY') || uDesc.includes('BELT')) {
    category = 'Mechanical & Power Transmission';
  } else if (uDesc.includes('MOTOR') || uDesc.includes('SENSOR') || uDesc.includes('SWITCH') || uDesc.includes('CABLE') || uDesc.includes('RELAY') || uDesc.includes('ENCODER') || uDesc.includes('PLC') || uDesc.includes('SOLENOID')) {
    category = 'Electrical & Automation';
  } else if (uDesc.includes('VALVE') || uDesc.includes('CYLINDER') || uDesc.includes('SEAL') || uDesc.includes('O-RING') || uDesc.includes('HOSE') || uDesc.includes('PNEUMATIC') || uDesc.includes('HYDRAULIC')) {
    category = 'Pneumatics & Hydraulics';
  } else if (uDesc.includes('PUMP') || uDesc.includes('IMPELLER') || uDesc.includes('FILTER') || uDesc.includes('STRAINER') || uDesc.includes('GASKET') || uDesc.includes('SPRINKLER')) {
    category = 'Pumps & Fluid Handling';
  } else if (uDesc.includes('BOLT') || uDesc.includes('NUT') || uDesc.includes('SCREW') || uDesc.includes('WASHER') || uDesc.includes('PIN')) {
    category = 'Fasteners & Hardware';
  }

  return {
    partNumber: matId,
    description: desc,
    category,
    equipmentStation: `${plantName} (${storageDesc})`,
    plant,
    storageLocation: storageLoc,
    storageDesc,
    materialGroup: matGroup,
    materialType: matType,
    uom,
    currentStock,
    stockValue,
    leadTimeDays,
    leadTimeText,
    annualQtyUsed: Math.max(1, Math.round(currentStock * 2 + (excelRank || 2) * 5)), // Realistic proxy
    downtimeImpactLevel,
    unitCostUSD: Math.round(stockValue > 0 ? (stockValue / Math.max(1, currentStock)) : 150),
    // Raw evaluation metrics from Excel
    prodImpactRank: prodImpactRank || 0,
    safetyRank: safetyRank || 0,
    leadTimeRank: leadTimeRank || 0,
    localMarketRank: localMarketRank || 0,
    substituteRank: substituteRank || 0,
    excelRank: excelRank || 0,
    excelRisk: excelRisk || 'UNASSESSED',
    recSafetyStock,
    isEvaluated: !!finalRow
  };
}

// 1. Process all 7,529 ZSPR Spare Parts
const zsprMaterials = new Set();
masterList.forEach(r => {
  if (r['Material Type'] === 'ZSPR') {
    const mat = String(r['Material'] || '').trim();
    if (mat) zsprMaterials.add(mat);
  }
});

// Also include any parts in Final List that might not be tagged ZSPR
finalList.forEach(r => {
  const mat = String(r['Material'] || '').trim();
  if (mat) zsprMaterials.add(mat);
});

console.log(`Total unique spare parts to import: ${zsprMaterials.size}`);

const allSpares = [];
zsprMaterials.forEach(matId => {
  const finalRow = finalMap.get(matId);
  const masterRow = masterMap.get(matId);
  allSpares.push(processSpare(matId, finalRow, masterRow));
});

console.log(`Successfully processed ${allSpares.length} plant spare parts.`);

const criticalCount = allSpares.filter(p => p.excelRisk === 'C').length;
const nonCriticalCount = allSpares.filter(p => p.excelRisk === 'NC').length;
const unassessedCount = allSpares.filter(p => p.excelRisk === 'UNASSESSED').length;

console.log('--- Import Summary ---');
console.log(`Total Spares : ${allSpares.length}`);
console.log(`Critical ('C') : ${criticalCount} (${((criticalCount/allSpares.length)*100).toFixed(1)}%)`);
console.log(`Normal ('NC')  : ${nonCriticalCount} (${((nonCriticalCount/allSpares.length)*100).toFixed(1)}%)`);
console.log(`Unassessed     : ${unassessedCount} (${((unassessedCount/allSpares.length)*100).toFixed(1)}%)`);

// Save to JSON in server/data/imported_parts.json
const outPath = path.resolve(__dirname, '../server/data/imported_parts.json');
fs.writeFileSync(outPath, JSON.stringify(allSpares, null, 2), 'utf8');
console.log(`Saved imported parts database to: ${outPath}`);
