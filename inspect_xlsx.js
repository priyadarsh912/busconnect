import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'c:\\Users\\Tanmay\\Downloads\\busconnect-main (1)\\tricity_bus_routes_3000.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(JSON.stringify(data.slice(0, 5), null, 2));
