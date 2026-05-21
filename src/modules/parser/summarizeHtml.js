const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const htmlPath = path.join(__dirname, '../../../templates/electrical-audit-template.html');
if (!fs.existsSync(htmlPath)) {
  console.error('HTML file not found!');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const $ = cheerio.load(html);

console.log('--- Document Structure Summary ---');
console.log('Total tables found:', $('table').length);

$('table').each((i, table) => {
  console.log(`\nTable ${i + 1}:`);
  const rows = $(table).find('tr');
  console.log(`- Rows count: ${rows.length}`);
  
  // Print headers
  const firstRowCols = [];
  $(rows[0]).find('td, th').each((j, col) => {
    firstRowCols.push($(col).text().trim().replace(/\s+/g, ' '));
  });
  console.log(`- Column headers:`, firstRowCols.slice(0, 8));
  
  if (rows.length > 1) {
    const secondRowCols = [];
    $(rows[1]).find('td, th').each((j, col) => {
      secondRowCols.push($(col).text().trim().replace(/\s+/g, ' '));
    });
    console.log(`- First data row sample:`, secondRowCols.slice(0, 4));
  }
});

console.log('\n--- Heading / Strong Elements ---');
$('h1, h2, h3, h4, h5, h6, p strong').each((i, el) => {
  const text = $(el).text().trim().replace(/\s+/g, ' ');
  if (text.length > 5 && text.length < 100) {
    console.log(`- [${el.name || 'p-strong'}]: ${text}`);
  }
});
