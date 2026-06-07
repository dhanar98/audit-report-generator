const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Ensure output directory exists
const targetDir = path.join(__dirname, '..', 'public', 'samples');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Client Data
const clientHeaders = ['Name'];
const clientRows = [
  ['Acme Corporation'],
  ['Globex Corporation'],
  ['Initech'],
  ['Umbrella Corporation'],
  ['Soylent Corp']
];

// Auditor Data
const auditorHeaders = ['Name', 'Email', 'Password'];
const auditorRows = [
  ['John Doe', 'john.doe@example.com', 'Password@123'],
  ['Jane Smith', 'jane.smith@example.com', 'SecurePass!321'],
  ['Bob Johnson', 'bob.johnson@example.com', 'Welcome@123'],
  ['Alice Williams', 'alice.williams@example.com', 'AliceAuditor#9']
];

// 1. Generate CSV strings
const clientsCsvContent = [clientHeaders.join(','), ...clientRows.map(row => row.join(','))].join('\n');
const auditorsCsvContent = [auditorHeaders.join(','), ...auditorRows.map(row => row.join(','))].join('\n');

// 2. Write CSV files
fs.writeFileSync(path.join(targetDir, 'sample_clients.csv'), clientsCsvContent, 'utf8');
fs.writeFileSync(path.join(targetDir, 'sample_auditors.csv'), auditorsCsvContent, 'utf8');
console.log('CSV files generated successfully.');

// 3. Generate XLSX files using SheetJS
// Clients XLSX
const clientsWb = XLSX.utils.book_new();
const clientsWs = XLSX.utils.aoa_to_sheet([clientHeaders, ...clientRows]);
XLSX.utils.book_append_sheet(clientsWb, clientsWs, 'Clients');
XLSX.writeFile(clientsWb, path.join(targetDir, 'sample_clients.xlsx'));

// Auditors XLSX
const auditorsWb = XLSX.utils.book_new();
const auditorsWs = XLSX.utils.aoa_to_sheet([auditorHeaders, ...auditorRows]);
XLSX.utils.book_append_sheet(auditorsWb, auditorsWs, 'Auditors');
XLSX.writeFile(auditorsWb, path.join(targetDir, 'sample_auditors.xlsx'));

console.log('XLSX files generated successfully.');
