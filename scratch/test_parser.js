const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const cheerio = require('cheerio');

const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

async function parseDocx(fileBuffer, fileName) {
  const { value: html } = await mammoth.convertToHtml({ buffer: fileBuffer });
  const $ = cheerio.load(html);
  
  const sections = [];
  let docTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  
  const firstHeading = $('h1, h2, h3').first().text().trim();
  if (firstHeading && firstHeading.length > 5 && firstHeading.length < 120) {
    docTitle = firstHeading;
  }
  
  const tables = $('table');
  tables.each((i, tableEl) => {
    const table = $(tableEl);
    const rows = table.find('tr');
    if (rows.length === 0) return;
    
    const columns = [];
    $(rows[0]).find('td, th').each((_, col) => {
      columns.push($(col).text().trim().replace(/\s+/g, ' '));
    });
    
    let tableTitle = `Section ${i + 1}`;
    let prevEl = table.prev();
    while (prevEl.length > 0 && prevEl.text().trim() === '') {
      prevEl = prevEl.prev();
    }
    if (prevEl.length > 0 && (prevEl.is('h1, h2, h3, h4, h5, h6') || prevEl.find('strong').length > 0)) {
      tableTitle = prevEl.text().trim().replace(/\s+/g, ' ');
    }
    
    sections.push({
      title: tableTitle,
      columnsCount: columns.length,
      columns: columns,
      rowsCount: rows.length - 1
    });
  });
  
  return {
    title: docTitle,
    sections
  };
}

async function run() {
  const dir = path.join(__dirname, '..', 'templates');
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.docx')) {
      console.log(`\n================== PARSING: ${file} ==================`);
      const buffer = fs.readFileSync(path.join(dir, file));
      const res = await parseDocx(buffer, file);
      console.log(`Document Title: ${res.title}`);
      console.log(`Number of sections parsed: ${res.sections.length}`);
      res.sections.forEach((sec, idx) => {
        console.log(`Section ${idx + 1}: Title="${sec.title}" Cols=${sec.columnsCount} Rows=${sec.rowsCount}`);
        console.log(`  Columns: [${sec.columns.join(' | ')}]`);
      });
    }
  }
}

run().catch(console.error);
