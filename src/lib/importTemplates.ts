import * as XLSX from 'xlsx';

export function downloadCsv(filename: string, headers: string[], sampleRows: string[][]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...sampleRows.map((row) => row.map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadXlsx(filename: string, headers: string[], sampleRows: string[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

export const CLIENTS_TEMPLATE = {
  headers: ['name', 'address'],
  sampleRows: [
    ['Indian Bank – Palarivattom Branch', 'NH Bypass, Palarivattom, Kochi'],
    ['Indian Bank – MG Road Branch', 'MG Road, Ernakulam'],
  ],
  csvFilename: 'clients_import_template.csv',
  xlsxFilename: 'clients_import_template.xlsx',
};

export const AUDITORS_TEMPLATE = {
  headers: ['name', 'email', 'password'],
  sampleRows: [
    ['Lead Auditor', 'auditor@example.com', 'Welcome@123'],
    ['Field Inspector', 'field.auditor@example.com', 'Welcome@123'],
  ],
  csvFilename: 'auditors_import_template.csv',
  xlsxFilename: 'auditors_import_template.xlsx',
};

export function parseSpreadsheetRows(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve([]);
          return;
        }

        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          const rows = lines.map((line) =>
            line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
          );
          resolve(rows);
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
        resolve(rows.filter((r) => r.some((c) => String(c).trim())));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
