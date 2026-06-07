import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

async function findUpsDetails() {
  const docxPath = '/home/dhanasekaran/audit-report-generator/Palarivattom Branch - IBE ESEA Report (Copy).docx';
  const buffer = fs.readFileSync(docxPath);
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);
  
  $('table').each((idx, tableEl) => {
    const text = $(tableEl).text().trim();
    if (text.includes('UPS') || text.includes('100AH') || text.includes('16 nos')) {
      console.log(`Table ${idx + 1}: cols = ${$(tableEl).find('tr').first().find('td, th').length}`);
      $(tableEl).find('tr').slice(0, 4).each((rIdx, tr) => {
        console.log(`  Row ${rIdx + 1}:`, $(tr).text().trim().substring(0, 100));
      });
    }
  });
  
  $('*').each((idx, el) => {
    const text = $(el).text().trim();
    if (text.includes('UPS DETAILS') && (el.tagName.startsWith('h') || $(el).find('strong').length > 0)) {
      console.log(`Found heading/strong containing "UPS DETAILS": tag = ${el.tagName}, text = "${text.substring(0, 80)}"`);
    }
  });
}

findUpsDetails();
