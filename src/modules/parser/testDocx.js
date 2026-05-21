const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function run() {
  const filePath = path.join(__dirname, '../../../templates/INDIAN_BANK_ELECTRICAL_AUDIT.docx');
  console.log('Reading file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  
  console.log('--- Mammoth Generated HTML Preview (1500 to 6000 chars) ---');
  console.log(result.value.substring(1500, 6000));
  console.log('-------------------------------------------------------');
  
  // Write full HTML to a temp file for inspection if needed
  fs.writeFileSync(path.join(__dirname, '../../../templates/electrical-audit-template.html'), result.value);
  console.log('Full HTML saved to templates/electrical-audit-template.html');
}

run().catch(console.error);
