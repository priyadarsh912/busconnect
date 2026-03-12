const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:/Users/Tanmay/Downloads/busconnect-main (1)/busconnect-main/public/datasets/delhi_outstation_routes_5000.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
console.log(JSON.stringify(data[0], null, 2));
