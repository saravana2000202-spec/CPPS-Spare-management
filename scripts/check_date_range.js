// scripts/check_date_range.js
const XLSX = require('xlsx');

const filePath = 'C:/Users/PS 2/Downloads/NPE1 history.xlsx';
const wb = XLSX.readFile(filePath);
const data = XLSX.utils.sheet_to_json(wb.Sheets['Data']);

let minDate = 999999;
let maxDate = 0;

data.forEach(r => {
  const d = Number(r['Posting Date'] || r['Entry Date']);
  if (d && !isNaN(d)) {
    if (d < minDate) minDate = d;
    if (d > maxDate) maxDate = d;
  }
});

// Excel serial date to JS Date: (serial - 25569) * 86400 * 1000
const toDate = serial => new Date((serial - 25569) * 86400 * 1000).toISOString().split('T')[0];

console.log('Min Date serial:', minDate, '->', toDate(minDate));
console.log('Max Date serial:', maxDate, '->', toDate(maxDate));

// Duration in months
const start = new Date(toDate(minDate));
const end = new Date(toDate(maxDate));
const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
console.log(`Total duration covered: ${monthsDiff} months (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]})`);
