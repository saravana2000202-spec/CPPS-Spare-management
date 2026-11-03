// scripts/analyze_consumption.js - Detailed analysis of NPE1 history transactions
const XLSX = require('xlsx');

const filePath = 'C:/Users/PS 2/Downloads/NPE1 history.xlsx';
const wb = XLSX.readFile(filePath);
const data = XLSX.utils.sheet_to_json(wb.Sheets['Data']);

console.log('Total transactions:', data.length);

const mvtTypes = {};
const years = {};
const uniqueMaterials = new Set();
let totalConsumedQty = 0;
let totalReceivedQty = 0;

data.forEach(r => {
  const mvt = String(r['Movement Type'] || '').trim();
  const mvtText = String(r['Movement Type Text'] || '').trim();
  const year = String(r['Material Doc. Year'] || '').trim();
  const mat = String(r.Material || '').trim();
  const qty = Number(r.Quantity || 0);

  mvtTypes[`${mvt} (${mvtText})`] = (mvtTypes[`${mvt} (${mvtText})`] || 0) + 1;
  years[year] = (years[year] || 0) + 1;
  if (mat) uniqueMaterials.add(mat);

  if (qty < 0) totalConsumedQty += Math.abs(qty);
  else totalReceivedQty += qty;
});

console.log('Movement Types:', mvtTypes);
console.log('Years distribution:', years);
console.log('Unique materials in transaction history:', uniqueMaterials.size);
console.log('Total Issue/Consumption Qty:', totalConsumedQty);
console.log('Total Receipt Qty:', totalReceivedQty);
