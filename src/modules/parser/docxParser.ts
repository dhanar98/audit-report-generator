import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { 
  ChecklistSchema, 
  TemplateSectionSchema, 
  TemplateFieldSchema, 
  TemplateTableSchema, 
  SectionType, 
  FieldType,
  RiskLevel
} from '../../types/schema';

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export async function parseDocx(fileBuffer: Buffer, fileName: string): Promise<ChecklistSchema> {
  // 1. Convert Word to HTML
  const { value: html } = await mammoth.convertToHtml({ buffer: fileBuffer });
  
  // 2. Parse HTML using Cheerio
  const $ = cheerio.load(html);
  
  const sections: TemplateSectionSchema[] = [];
  let currentSectionTitle = 'Audit Checklist';
  let orderIndex = 0;
  
  // Determine title from file name or first H1/strong text
  let docTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const firstStrong = $('p strong').first().text().trim();
  if (firstStrong && firstStrong.length > 10 && firstStrong.length < 100) {
    docTitle = firstStrong;
  }
  
  // Find all tables and parse them
  const tables = $('table');
  
  tables.each((i, tableEl) => {
    const table = $(tableEl);
    const rows = table.find('tr');
    if (rows.length === 0) return;
    
    // Extract headers / columns from first row
    const columns: string[] = [];
    $(rows[0]).find('td, th').each((_, col) => {
      columns.push($(col).text().trim().replace(/\s+/g, ' '));
    });
    
    // Classify Table Type and generate sections
    const uppercaseCols = columns.map(c => c.toUpperCase());
    
    // Try to find the heading preceding the table
    let tableTitle = `Section ${i + 1}`;
    let prevEl = table.prev();
    while (prevEl.length > 0 && prevEl.text().trim() === '') {
      prevEl = prevEl.prev();
    }
    if (prevEl.length > 0 && (prevEl.is('h1, h2, h3, h4, h5, h6') || prevEl.find('strong').length > 0)) {
      tableTitle = prevEl.text().trim().replace(/\s+/g, ' ');
    }
    
    // Case 1: Header Info Table (Key-Value style, e.g. Table 1)
    // 2 columns, mostly strings or placeholders in the second column
    if (columns.length === 2 && 
        (uppercaseCols[0].includes('BRANCH') || 
         uppercaseCols[0].includes('ADDRESS') || 
         uppercaseCols[0].includes('LOAD') || 
         uppercaseCols[0].includes('DATE'))) {
      
      const fields: TemplateFieldSchema[] = [];
      
      rows.each((rowIndex, rowEl) => {
        const cells = $(rowEl).find('td');
        if (cells.length === 2) {
          const key = $(cells[0]).text().trim().replace(/\s+/g, ' ');
          let val = $(cells[1]).text().trim().replace(/\s+/g, ' ');
          
          // Check for placeholders e.g., {branch_name}
          const hasPlaceholder = val.startsWith('{') && val.endsWith('}');
          
          fields.push({
            id: generateId('field'),
            title: key,
            type: 'text',
            required: true,
            riskLevel: 'NONE',
            defaultValue: hasPlaceholder ? val : ''
          });
        }
      });
      
      sections.push({
        id: generateId('sec'),
        title: tableTitle || 'General Information',
        type: 'header',
        orderIndex: orderIndex++,
        fields
      });
      
      return;
    }
    
    // Case 2: YES/NO Questionnaires (Checklist, e.g. Table 6 - Safety Questioner)
    // Check if any column header represents choices or DETAILS like YES/NO
    const hasYesNoHeader = uppercaseCols.some(c => c.includes('YES/NO') || c.includes('DETAILS') || c.includes('STATUS'));
    const isDetailsColumnYesNo = rows.length > 1 && $(rows[1]).find('td').eq(2).text().trim().toUpperCase().includes('YES / NO');
    
    if (hasYesNoHeader || isDetailsColumnYesNo) {
      const fields: TemplateFieldSchema[] = [];
      
      // Determine description column index (usually index 1)
      const descIndex = columns.length > 2 ? 1 : 0;
      
      rows.each((rowIndex, rowEl) => {
        if (rowIndex === 0) return; // skip header
        const cells = $(rowEl).find('td');
        if (cells.length > descIndex) {
          const desc = $(cells[descIndex]).text().trim().replace(/\s+/g, ' ');
          if (desc === '' || desc.length < 5) return;
          
          // Check if there is a recommendation column (often last column or column 3)
          let reco: string | undefined = undefined;
          if (cells.length > 3) {
            reco = $(cells[3]).text().trim().replace(/\s+/g, ' ');
          }
          
          fields.push({
            id: generateId('field'),
            title: desc,
            type: 'yes_no',
            required: true,
            riskLevel: desc.toUpperCase().includes('FIRE') || desc.toUpperCase().includes('EARTHING') ? 'HIGH' : 'MEDIUM',
            recoMapping: reco || 'Rectification to be completed immediately.'
          });
        }
      });
      
      sections.push({
        id: generateId('sec'),
        title: tableTitle || 'Safety Checklist',
        type: 'checklist',
        orderIndex: orderIndex++,
        fields
      });
      
      return;
    }
    
    // Case 3: Observations Table (e.g. Table 5)
    // 3 columns: S.No, Description, Observation
    if (columns.length === 3 && uppercaseCols.some(c => c.includes('OBSERVATION') || c.includes('REMARK'))) {
      const fields: TemplateFieldSchema[] = [];
      
      rows.each((rowIndex, rowEl) => {
        if (rowIndex === 0) return; // skip header
        const cells = $(rowEl).find('td');
        if (cells.length >= 2) {
          const desc = $(cells[1]).text().trim().replace(/\s+/g, ' ');
          if (desc === '' || desc.length < 5) return;
          
          fields.push({
            id: generateId('field'),
            title: desc,
            type: 'textarea',
            required: false,
            riskLevel: 'LOW',
            recoMapping: 'Record findings and suggest rectification.'
          });
        }
      });
      
      sections.push({
        id: generateId('sec'),
        title: tableTitle || 'Audit Observations',
        type: 'observation',
        orderIndex: orderIndex++,
        fields
      });
      
      return;
    }
    
    // Case 4: Signatures Table (e.g. Table 7)
    // Contains "SIGNATURE" or "BRANCH MANAGER"
    if (uppercaseCols.some(c => c.includes('SIGNATURE') || c.includes('MANAGER') || c.includes('AUDITOR'))) {
      const fields: TemplateFieldSchema[] = [];
      
      columns.forEach((col) => {
        if (col === '') return;
        fields.push({
          id: generateId('field'),
          title: col,
          type: 'signature',
          required: true,
          riskLevel: 'NONE'
        });
      });
      
      sections.push({
        id: generateId('sec'),
        title: 'Signatures and Authorizations',
        type: 'signature',
        orderIndex: orderIndex++,
        fields
      });
      
      return;
    }
    
    // Case 5: Default General Table (e.g. Room Load table, Phase load table)
    // We treat this as a spreadsheet-like Table Builder section
    const tableRows: string[][] = [];
    rows.each((rowIndex, rowEl) => {
      if (rowIndex === 0) return; // header columns already parsed
      const cells = $(rowEl).find('td');
      const rowData: string[] = [];
      cells.each((_, cell) => {
        rowData.push($(cell).text().trim().replace(/\s+/g, ' '));
      });
      if (rowData.some(cell => cell !== '')) {
        tableRows.push(rowData);
      }
    });
    
    sections.push({
      id: generateId('sec'),
      title: tableTitle || 'General Data Grid',
      type: 'table',
      orderIndex: orderIndex++,
      tables: [{
        id: generateId('table'),
        title: tableTitle || 'Data Grid',
        columns,
        rows: tableRows
      }]
    });
  });
  
  // If we couldn't parse any table sections, add a default checklist section
  if (sections.length === 0) {
    sections.push({
      id: generateId('sec'),
      title: 'General Audit Checklist',
      type: 'checklist',
      orderIndex: 0,
      fields: [
        {
          id: generateId('field'),
          title: 'Is the electrical wiring safe and insulated?',
          type: 'yes_no',
          required: true,
          riskLevel: 'HIGH',
          recoMapping: 'Replace raw exposed wires with conduits.'
        }
      ]
    });
  }
  
  return {
    title: docTitle || 'Electrical Energy Audit Checklist',
    description: `Generated automatically from ${fileName}`,
    version: 1,
    sections
  };
}
