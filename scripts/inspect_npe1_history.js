// scripts/inspect_npe1_history.js - Inspect NPE1 history.xlsx
const XLSX = require('xlsx');

const filePath = 'C:/Users/PS 2/Downloads/NPE1 history.xlsx';
console.log('Reading:', filePath);
const wb = XLSX.readFile(filePath);

console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: "${sheetName}" ---`);
  console.log(`Total Rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Header Row 0:', rows[0]);
    if (rows.length > 1) console.log('Row 1:', rows[1]);
    if (rows.length > 2) console.log('Row 2:', rows[2]);
    if (rows.length > 3) console.log('Row 3:', rows[3]);
  }
});
