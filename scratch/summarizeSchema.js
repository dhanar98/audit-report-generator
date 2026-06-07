import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'parsed_schema.json');
const schema = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('=== SCHEMA SUMMARY ===');
console.log('Title:', schema.title);
console.log('Sections count:', schema.sections.length);

schema.sections.forEach((sec, idx) => {
  console.log(`\n${idx + 1}. [${sec.type}] "${sec.title}"`);
  if (sec.fields) {
    console.log(`   Fields: ${sec.fields.length}`);
    sec.fields.slice(0, 2).forEach(f => {
      console.log(`     - [${f.type}] "${f.title.substring(0, 80)}${f.title.length > 80 ? '...' : ''}"`);
    });
    if (sec.fields.length > 2) console.log(`     ... and ${sec.fields.length - 2} more`);
  }
  if (sec.tables) {
    console.log(`   Tables: ${sec.tables.length}`);
    sec.tables.forEach(t => {
      console.log(`     - Table: "${t.title}" with cols: [${t.columns.join(', ')}]`);
    });
  }
});
