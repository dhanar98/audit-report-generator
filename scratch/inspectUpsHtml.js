import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

async function inspectUpsHtml() {
  const docxPath = '/home/dhanasekaran/audit-report-generator/Palarivattom Branch - IBE ESEA Report (Copy).docx';
  const buffer = fs.readFileSync(docxPath);
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);
  
  const tables = $('table');
  const upsTable = tables.eq(21); // index 21 is Table 22
  console.log('UPS Table HTML:');
  upsTable.find('tr').each((rIdx, tr) => {
    const cells = [];
    $(tr).find('td').each((cIdx, td) => {
      cells.push($(td).text().trim());
    });
    console.log(`Row ${rIdx + 1}:`, cells);
  });
}

inspectUpsHtml();
