// scripts/check_join.js
const XLSX = require('xlsx');

const workbook = XLSX.readFile('C:/Users/PS 2/Downloads/Critical Spare.xlsx');
const finalData = XLSX.utils.sheet_to_json(workbook.Sheets['Final List']);
const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['Master']);

console.log('Final List count:', finalData.length);
console.log('Master count:', masterData.length);

const masterMap = new Map();
masterData.forEach(row => {
  const mat = String(row['Material'] || '').trim();
  if (mat) {
    masterMap.set(mat, row);
  }
});

let matched = 0;
finalData.forEach(row => {
  const mat = String(row['Material'] || '').trim();
  if (masterMap.has(mat)) matched++;
});

console.log(`Matched ${matched} of ${finalData.length} parts from Master sheet.`);
if (finalData.length > 0) {
  const sampleMat = String(finalData[0]['Material']).trim();
  console.log('Sample matched data for', sampleMat, ':', masterMap.get(sampleMat));
}
