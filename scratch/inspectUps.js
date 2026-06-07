import fs from 'fs';
import path from 'path';

const jsonPath = '/home/dhanasekaran/audit-report-generator/scratch/parsed_schema.json';
const schema = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const upsSection = schema.sections.find(s => s.title.includes('UPS DETAILS'));
if (upsSection) {
  console.log('UPS Section:', JSON.stringify(upsSection, null, 2));
} else {
  console.log('UPS DETAILS section not found.');
}
