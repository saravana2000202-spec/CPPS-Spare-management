// scripts/inspect_excel.js - Inspect sheet names and columns of Critical Spare.xlsx
const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/PS 2/Downloads/Critical Spare.xlsx';
console.log('Reading Excel file from:', filePath);

const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: "${sheetName}" ---`);
  console.log(`Total Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Row 0 (potential headers):', data[0]);
    if (data.length > 1) {
      console.log('Row 1 (first data/sub-header):', data[1]);
    }
    if (data.length > 2) {
      console.log('Row 2 (second data row):', data[2]);
    }
    if (data.length > 3) {
      console.log('Row 3 (third data row):', data[3]);
    }
  }
});
