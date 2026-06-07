const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const cheerio = require('cheerio');

async function inspect() {
  const filePath = path.join(__dirname, '..', 'Palarivattom Branch - IBE ESEA Report (Copy).docx');
  console.log('Reading file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist!');
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const { value: html } = await mammoth.convertToHtml({ buffer });
  
  // Write html to a text file for inspection
  const htmlPath = path.join(__dirname, 'extracted_content.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('HTML written to:', htmlPath);
  
  const $ = cheerio.load(html);
  
  console.log('=== Headings ===');
  $('h1, h2, h3, h4').each((i, el) => {
    console.log(`${el.name}: ${$(el).text().trim()}`);
  });
  
  console.log('=== Tables ===');
  const tables = $('table');
  console.log('Total tables found:', tables.length);
  
  tables.each((i, el) => {
    const table = $(el);
    const rows = table.find('tr');
    console.log(`\n--- Table ${i + 1} (${rows.length} rows) ---`);
    
    // Print first 2 rows
    rows.slice(0, 3).each((j, rowEl) => {
      const cells = $(rowEl).find('td, th');
      const rowData = [];
      cells.each((_, cell) => {
        rowData.push($(cell).text().trim().replace(/\s+/g, ' '));
      });
      console.log(`  Row ${j + 1}:`, rowData.slice(0, 5).join(' | ') + (rowData.length > 5 ? ' ...' : ''));
    });
  });
}

inspect().catch(console.error);
