// scripts/generate_sample_csv.js - Generate 7,250 sample parts CSV
const fs = require('fs');
const path = require('path');
const { generatePlantParts } = require('../server/data/parts_generator');

const parts = generatePlantParts(7250);

const headers = [
  'Part_Number',
  'Description',
  'Category',
  'Equipment_Station',
  'Supplier',
  'Source_Type',
  'Lead_Time_Days',
  'Annual_Qty_Used',
  'Downtime_Impact_Level',
  'Unit_Cost_USD'
];

const escapeCsv = (str) => {
  if (str === null || str === undefined) return '';
  const s = String(str).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
};

const rows = parts.map(p => [
  escapeCsv(p.partNumber),
  escapeCsv(p.description),
  escapeCsv(p.category),
  escapeCsv(p.equipmentStation),
  escapeCsv(p.supplier),
  escapeCsv(p.sourceType),
  p.leadTimeDays !== null ? p.leadTimeDays : '',
  p.annualQtyUsed,
  escapeCsv(p.downtimeImpactLevel),
  p.unitCostUSD
].join(','));

const csvContent = [headers.join(','), ...rows].join('\n');
const targetFile = path.resolve(__dirname, '../plant_parts_master_sample.csv');
fs.writeFileSync(targetFile, csvContent, 'utf8');

console.log(`Successfully generated '${targetFile}' with ${parts.length} parts.`);
