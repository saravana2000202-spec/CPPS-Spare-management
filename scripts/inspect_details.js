// scripts/inspect_details.js
const XLSX = require('xlsx');

const workbook = XLSX.readFile('C:/Users/PS 2/Downloads/Critical Spare.xlsx');

// 1. Inspect Category sheet
const catSheet = workbook.Sheets['Category'];
const catData = XLSX.utils.sheet_to_json(catSheet, { header: 1 });
console.log('--- Category Sheet Content ---');
catData.forEach((r, idx) => console.log(`Row ${idx}:`, r));

// 2. Inspect Final List Risk values
const finalListSheet = workbook.Sheets['Final List'];
const finalData = XLSX.utils.sheet_to_json(finalListSheet);
console.log('\n--- Final List Summary ---');
console.log('Total items in Final List:', finalData.length);

const riskCounts = {};
finalData.forEach(row => {
  const risk = String(row['Risk'] || row['Risk '] || 'BLANK').trim();
  riskCounts[risk] = (riskCounts[risk] || 0) + 1;
});
console.log('Risk breakdown in Final List:', riskCounts);

// Sample of Critical parts in Final List
const criticals = finalData.filter(row => {
  const risk = String(row['Risk'] || row['Risk '] || '').trim();
  return risk === 'C' || risk.toUpperCase().includes('CRIT');
});
console.log('\nSample Critical parts in Final List (first 5):');
console.log(criticals.slice(0, 5));

// Check Master sheet unique materials
const masterSheet = workbook.Sheets['Master'];
const masterData = XLSX.utils.sheet_to_json(masterSheet);
console.log('\nTotal items in Master sheet:', masterData.length);
