import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

async function inspectDocxStructure() {
  const docxPath = '/home/dhanasekaran/audit-report-generator/Palarivattom Branch - IBE ESEA Report (Copy).docx';
  const buffer = fs.readFileSync(docxPath);
  const { value: html } = await mammoth.convertToHtml({ buffer });
  
  const $ = cheerio.load(html);
  
  console.log('=== Tag Sequence ===');
  let tagCount = 0;
  $('body').children().each((idx, el) => {
    if (tagCount > 150) return;
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    const displayVal = text.length > 80 ? text.substring(0, 80) + '...' : text;
    
    if (tag === 'table') {
      const colCount = $(el).find('tr').first().find('td, th').length;
      const rowCount = $(el).find('tr').length;
      console.log(`${idx + 1}. [table] (${colCount} cols x ${rowCount} rows) - first cell: "${$(el).find('td').first().text().trim().substring(0, 30)}"`);
    } else {
      console.log(`${idx + 1}. [${tag}] - "${displayVal}"`);
    }
    tagCount++;
  });
}

inspectDocxStructure();
