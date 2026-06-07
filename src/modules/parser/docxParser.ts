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

// Helper to merge consecutive tables split across pages with same headers
function mergeConsecutiveTables($: any) {
  const tables = $('table');
  let prevTable: any = null;
  let prevHeaders: string[] = [];

  tables.each((_: any, tableEl: any) => {
    const table = $(tableEl);
    const rows = table.find('tr');
    if (rows.length === 0) return;

    // Get headers of this table
    const headers: string[] = [];
    $(rows[0]).find('td, th').each((_: any, col: any) => {
      headers.push($(col).text().trim().replace(/\s+/g, ' ').toUpperCase());
    });

    if (prevTable && JSON.stringify(prevHeaders) === JSON.stringify(headers) && headers.length > 0) {
      // Same headers! Merge this table's rows into the previous table
      const rowsToMove = rows.slice(1); // skip header row of current table
      prevTable.append(rowsToMove);
      // Remove this table from DOM
      table.remove();
    } else {
      prevTable = table;
      prevHeaders = headers;
    }
  });
}

// Helper to check if a table is a compliance checklist (Case 2)
const isChecklistTable = (columns: string[], rows: any, $: any) => {
  // If the table has more than 4 columns, it's a data readings table, not a checklist questionnaire
  if (columns.length > 4) return false;

  const uppercaseCols = columns.map(c => c.toUpperCase());
  
  // 1. Check if the header contains YES/NO or STATUS indicators
  const hasYesNoHeader = uppercaseCols.some(c => 
    c.includes('YES/NO') || 
    c.includes('YES / NO') || 
    c.includes('STATUS') || 
    c.includes('COMPLIANCE') || 
    c.includes('COMPLY') || 
    c.includes('MET') || 
    c.includes('PASS/FAIL') || 
    c.includes('CONFORMANCE')
  );
  if (hasYesNoHeader) return true;
  
  // 2. Check if the columns contain DETAILS or REMARKS, and ANY row has YES/NO answers
  const hasDetailsOrRemarksHeader = uppercaseCols.some(c => c.includes('DETAILS') || c.includes('REMARKS') || c.includes('ANSWER'));
  if (hasDetailsOrRemarksHeader) {
    let foundYesNoCell = false;
    rows.each((rowIndex: any, rowEl: any) => {
      if (rowIndex === 0) return; // skip header
      const cells = $(rowEl).find('td');
      cells.each((cellIndex: any, cellEl: any) => {
        if (cellIndex < 1 || cellIndex > 3) return;
        const cellText = $(cellEl).text().trim().toUpperCase();
        // Check if cell has both YES and NO after removing checkboxes
        const cleaned = cellText.replace(/[\u2610\u2612\u2611☒☐☑]/g, '').trim();
        if (cleaned.includes('YES') && cleaned.includes('NO')) {
          foundYesNoCell = true;
        }
      });
    });
    if (foundYesNoCell) return true;
  }
  
  return false;
};

export async function parseDocx(fileBuffer: Buffer, fileName: string): Promise<ChecklistSchema> {
  // 1. Convert Word to HTML
  const { value: html } = await mammoth.convertToHtml({ buffer: fileBuffer });
  
  // 2. Parse HTML using Cheerio
  const $ = cheerio.load(html);
  
  // Merge split tables first
  mergeConsecutiveTables($);
  
  const sections: TemplateSectionSchema[] = [];
  let orderIndex = 0;
  
  // Determine title from file name or first H1/strong text
  let docTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const firstHeading = $('h1, h2, h3').first().text().trim();
  const firstStrong = $('p strong').first().text().trim();
  if (firstHeading && firstHeading.length > 5 && firstHeading.length < 120) {
    docTitle = firstHeading;
  } else if (firstStrong && firstStrong.length > 10 && firstStrong.length < 100) {
    docTitle = firstStrong;
  }
  
  let accumulatedHtml = '';
  
  const flushAccumulated = () => {
    const trimmed = accumulatedHtml.trim();
    if (trimmed === '') return;
    
    // Parse accumulated HTML to find the first heading to use as title
    const $sub = cheerio.load(accumulatedHtml);
    let title = 'Information Section';
    const firstHeading = $sub('h1, h2, h3, h4').first();
    if (firstHeading.length > 0) {
      title = firstHeading.text().trim().replace(/\s+/g, ' ');
    } else {
      const firstStrong = $sub('p strong, strong').first();
      if (firstStrong.length > 0) {
        title = firstStrong.text().trim().replace(/\s+/g, ' ');
      }
    }
    
    if (title.length > 100) {
      title = title.substring(0, 100) + '...';
    }
    
    sections.push({
      id: generateId('sec'),
      title: title || 'Information Section',
      type: 'rich_content',
      orderIndex: orderIndex++,
      description: accumulatedHtml
    });
    
    accumulatedHtml = '';
  };
  
  // Iterate sequentially over body children
  $('body').children().each((_: any, el: any) => {
    const $el = $(el);
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'table') {
      flushAccumulated();
      
      const rows = $el.find('tr');
      if (rows.length === 0) return;
      
      // Extract columns
      const columns: string[] = [];
      $(rows[0]).find('td, th').each((_: any, col: any) => {
        columns.push($(col).text().trim().replace(/\s+/g, ' '));
      });
      
      const uppercaseCols = columns.map(c => c.toUpperCase());
      
      // Try to find the heading preceding the table (look back in DOM)
      let tableTitle = '';
      let prevEl = $el.prev();
      while (prevEl.length > 0 && prevEl.text().trim() === '') {
        prevEl = prevEl.prev();
      }
      if (prevEl.length > 0 && !prevEl.is('table')) {
        if (prevEl.is('h1, h2, h3, h4, h5, h6') || prevEl.find('strong').length > 0) {
          const text = prevEl.text().trim().replace(/\s+/g, ' ');
          if (text.length > 0 && text.length < 120) {
            tableTitle = text;
          }
        }
      }
      
      // Case 1: Header Info Table (Key-Value style, e.g. Table 1)
      if (columns.length === 2 && 
          (uppercaseCols[0].includes('BRANCH') || 
           uppercaseCols[0].includes('ADDRESS') || 
           uppercaseCols[0].includes('LOAD') || 
           uppercaseCols[0].includes('DATE') ||
           uppercaseCols[0].includes('CLIENT') ||
           uppercaseCols[0].includes('AUDITOR') ||
           uppercaseCols[0].includes('LOCATION') ||
           uppercaseCols[0].includes('DEPARTMENT') ||
           uppercaseCols[0].includes('REF') ||
           uppercaseCols[0].includes('MANAGER') ||
           uppercaseCols[0].includes('SITE') ||
           uppercaseCols[0].includes('PROJECT') ||
           uppercaseCols[0].includes('COMPANY') ||
           uppercaseCols[0].includes('GENERAL INFO') ||
           uppercaseCols[0].includes('TITLE') ||
           uppercaseCols[0].includes('NAME'))) {
        
        const fields: TemplateFieldSchema[] = [];
        
        rows.each((rowIndex: any, rowEl: any) => {
          const cells = $(rowEl).find('td');
          if (cells.length === 2) {
            const key = $(cells[0]).text().trim().replace(/\s+/g, ' ');
            let val = $(cells[1]).text().trim().replace(/\s+/g, ' ');
            
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
      
      // Case 2: YES/NO Questionnaires (Checklist)
      if (isChecklistTable(columns, rows, $)) {
        const fields: TemplateFieldSchema[] = [];
        let prevField: TemplateFieldSchema | null = null;
        const descIndex = columns.length > 2 ? 1 : 0;
        
        rows.each((rowIndex: any, rowEl: any) => {
          if (rowIndex === 0) return; // skip header
          const cells = $(rowEl).find('td');
          if (cells.length > descIndex) {
            const sNo = $(cells[0]).text().trim();
            const desc = $(cells[descIndex]).text().trim().replace(/\s+/g, ' ');
            
            // Check if this row has YES/NO options
            let hasYesNo = false;
            cells.each((_: any, cellEl: any) => {
              const cellText = $(cellEl).text().trim().toUpperCase();
              const cleaned = cellText.replace(/[\u2610\u2612\u2611☒☐☑]/g, '').trim();
              if (cleaned.includes('YES') && cleaned.includes('NO')) {
                hasYesNo = true;
              }
            });
            
            // If no YES/NO and no S.No, it is a continuation of the previous question
            if (!hasYesNo && sNo === '') {
              if (prevField && desc !== '') {
                prevField.title += ' ' + desc;
              }
              return;
            }
            
            if (desc === '' || desc.length < 5) return;
            
            let reco: string | undefined = undefined;
            if (cells.length > 3) {
              reco = $(cells[3]).text().trim().replace(/\s+/g, ' ');
            }
            
            const newField: TemplateFieldSchema = {
              id: generateId('field'),
              title: desc,
              type: 'yes_no',
              required: true,
              riskLevel: (() => {
                const u = desc.toUpperCase();
                const highTerms = ['FIRE', 'EARTHING', 'CRITICAL', 'HAZARD', 'EXPOSED', 'DANGER', 'HIGH VOLTAGE', 'BREACH', 'SECURITY', 'MALFUNCTION', 'SHUTDOWN', 'LIQUIDATION', 'FRAUD', 'COMPLIANCE VIOLATION', 'SAFETY CABLE', 'GAS LEAK'];
                const medTerms = ['MAINTENANCE', 'WARNING', 'INSULATION', 'VENTILATION', 'SIGNAGE', 'ACCESS CONTROL', 'EXPIRED', 'PROCEDURE', 'INCOMPLETE', 'DOCUMENTATION', 'CALIBRATION'];
                if (highTerms.some(t => u.includes(t))) return 'HIGH';
                if (medTerms.some(t => u.includes(t))) return 'MEDIUM';
                return 'LOW';
              })(),
              recoMapping: reco || 'Rectification to be completed immediately.'
            };
            
            fields.push(newField);
            prevField = newField;
          }
        });
        
        sections.push({
          id: generateId('sec'),
          title: tableTitle || 'Compliance Checklist',
          type: 'checklist',
          orderIndex: orderIndex++,
          fields
        });
        
        return;
      }
      
      // Case 3: Observations Table (e.g. Table 5)
      const hasObservationHeader = uppercaseCols.some(c => 
        c.includes('OBSERVATION') || 
        c.includes('REMARK') || 
        c.includes('FINDING') || 
        c.includes('COMMENT') || 
        c.includes('NON-COMPLIANCE') || 
        c.includes('DEFECT') || 
        c.includes('RECOMMENDATION')
      );
      if (columns.length === 3 && hasObservationHeader) {
        const fields: TemplateFieldSchema[] = [];
        
        rows.each((rowIndex: any, rowEl: any) => {
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
          title: tableTitle || 'Observations and Findings',
          type: 'observation',
          orderIndex: orderIndex++,
          fields
        });
        
        return;
      }
      
      // Case 4: Signatures Table
      if (uppercaseCols.some(c => c.includes('SIGNATURE') || c.includes('MANAGER') || c.includes('AUDITOR'))) {
        const fields: TemplateFieldSchema[] = [];
        
        columns.forEach((col: any) => {
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
      
      // Case 5: Default General Table
      const tableRows: string[][] = [];
      rows.each((rowIndex: any, rowEl: any) => {
        if (rowIndex === 0) return; // header columns already parsed
        const cells = $(rowEl).find('td');
        const rowData: string[] = [];
        cells.each((_: any, cell: any) => {
          rowData.push($(cell).text().trim().replace(/\s+/g, ' '));
        });
        if (rowData.some(cell => cell !== '')) {
          tableRows.push(rowData);
        }
      });
      
      sections.push({
        id: generateId('sec'),
        title: tableTitle || 'Audit Data Grid',
        type: 'table',
        orderIndex: orderIndex++,
        tables: [{
          id: generateId('table'),
          title: tableTitle || 'Data Grid',
          columns,
          rows: tableRows
        }]
      });
    } else {
      // Accumulate rich text or styling HTML elements
      accumulatedHtml += $.html(el);
    }
  });
  
  // Flush remaining accumulated content at the end of the document
  flushAccumulated();
  
  return {
    title: docTitle || 'General Compliance Audit Checklist',
    description: `Generated automatically from ${fileName}`,
    version: 1,
    sections
  };
}
