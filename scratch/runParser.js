import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const filePath = path.join(__dirname, '..', 'Palarivattom Branch - IBE ESEA Report (Copy).docx');
  const buffer = fs.readFileSync(filePath);
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);
  
  const tables = $('table');
  tables.each((i, tableEl) => {
    const table = $(tableEl);
    const rows = table.find('tr');
    
    // We are interested in tables that have headers like S.NO., DESCRIPTION, DETAILS
    const firstRowCells = [];
    $(rows[0]).find('td, th').each((_, cell) => {
      firstRowCells.push($(cell).text().trim());
    });
    
    if (firstRowCells.includes('DETAILS') || firstRowCells.includes('Details')) {
      console.log(`\nTable ${i + 1}:`);
      console.log('  Headers:', firstRowCells);
      if (rows.length > 1) {
        const secondRowCells = [];
        $(rows[1]).find('td').each((_, cell) => {
          secondRowCells.push($(cell).text().trim());
        });
        console.log('  Row 2:', secondRowCells);
        
        // Test our condition elements
        const cell2Text = $(rows[1]).find('td').eq(2).text().trim();
        console.log('  Cell index 2 text:', JSON.stringify(cell2Text));
        console.log('  Cell index 2 uppercase:', JSON.stringify(cell2Text.toUpperCase()));
        console.log('  Contains "YES / NO":', cell2Text.toUpperCase().includes('YES / NO'));
        console.log('  Contains "YES/NO":', cell2Text.toUpperCase().includes('YES/NO'));
        console.log('  Contains "YES" and "NO":', cell2Text.toUpperCase().includes('YES') && cell2Text.toUpperCase().includes('NO'));
      }
    }
  });
}

test().catch(console.error);
