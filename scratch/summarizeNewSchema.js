import fs from 'fs';
import path from 'path';

const jsonPath = '/home/dhanasekaran/audit-report-generator/scratch/parsed_schema.json';
const schema = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Document Title: "${schema.title}"`);
console.log(`Total Sections: ${schema.sections.length}`);
console.log('=== Sections Summary ===');

schema.sections.forEach((sec, idx) => {
  console.log(`${idx + 1}. [${sec.type}] "${sec.title}"`);
  if (sec.type === 'checklist' || sec.type === 'header' || sec.type === 'observation' || sec.type === 'signature') {
    console.log(`    Fields (${sec.fields?.length || 0}):`, (sec.fields || []).slice(0, 3).map(f => `[${f.type}] "${f.title.substring(0, 40)}"`).join(', '));
  } else if (sec.type === 'table') {
    const tbl = sec.tables?.[0];
    console.log(`    Grid Table "${tbl?.title}": ${tbl?.columns?.length} cols x ${tbl?.rows?.length} rows`);
  } else if (sec.type === 'rich_content') {
    console.log(`    Rich text preview (first 100 chars): "${sec.description?.substring(0, 100).replace(/\s+/g, ' ')}"`);
  }
});
