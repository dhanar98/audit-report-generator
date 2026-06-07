import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDocx } from '../src/modules/parser/docxParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const filePath = path.join(__dirname, '..', 'Palarivattom Branch - IBE ESEA Report (Copy).docx');
  const buffer = fs.readFileSync(filePath);
  const schema = await parseDocx(buffer, path.basename(filePath));
  
  const outputPath = path.join(__dirname, 'parsed_schema.json');
  fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf8');
  console.log('Parsed schema written to:', outputPath);
}

test().catch(console.error);
