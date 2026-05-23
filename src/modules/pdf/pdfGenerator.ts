import puppeteer from 'puppeteer-core';
import Handlebars from 'handlebars';
import { DynamicChecklistSchema, DynamicAuditSession, DynamicComponentResponse } from '@/types/dynamicSchema';

// Handlebars helpers
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('getAnswer', function (responses: DynamicComponentResponse[], compId: string) {
  const resp = responses.find(r => r.componentId === compId);
  return resp || { componentId: compId };
});

Handlebars.registerHelper('getChecklistItemAnswer', function (resp: DynamicComponentResponse, itemId: string) {
  return resp?.checklistAnswers?.find(a => a.itemId === itemId);
});

Handlebars.registerHelper('getGridCellValue', function (resp: DynamicComponentResponse, rowId: string, colId: string) {
  return resp?.tableRows?.find(c => c.rowId === rowId && c.colId === colId)?.value || '';
});

// A4 Optimized PDF Handlebars Layout
const PDF_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compliance Audit Report - {{session.clientName}}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.4;
      font-size: 11px;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    
    /* Cover Page */
    .cover-page {
      height: 245mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .cover-header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 15px;
    }
    .cover-title {
      font-size: 26px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      margin: 0 0 8px 0;
      letter-spacing: 0.5px;
    }
    .cover-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      font-weight: 600;
    }
    .cover-middle {
      text-align: center;
      margin: 80px 0;
    }
    .score-circle {
      display: inline-block;
      border: 4px solid #3b82f6;
      border-radius: 50%;
      width: 130px;
      height: 130px;
      line-height: 122px;
      text-align: center;
      font-size: 32px;
      font-weight: 900;
      color: #3b82f6;
      background-color: #eff6ff;
    }
    .score-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
      font-weight: bold;
      margin-top: 15px;
    }
    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }
    .metadata-table td {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .metadata-table td.label {
      font-weight: 700;
      background-color: #f8fafc;
      width: 35%;
      color: #334155;
    }
    
    /* Content sections */
    .section-container {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 12px;
      margin-top: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0;
    }
    
    /* Generic elements */
    .rich-content {
      padding: 12px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 15px;
      color: #334155;
      font-size: 10px;
    }
    .badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      display: inline-block;
    }
    .badge-primary { background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-high { background-color: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-med { background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    .badge-low { background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    
    /* Checklist Table */
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .checklist-table th, .checklist-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 10px;
      text-align: left;
    }
    .checklist-table th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    .status-cell {
      font-weight: 700;
      text-align: center;
      width: 60px;
    }
    
    /* Remediation Finding Box */
    .finding-box {
      background-color: #fffafb;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      padding: 12px;
      margin-top: 8px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .finding-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      color: #991b1b;
      border-bottom: 1px solid #fee2e2;
      padding-bottom: 4px;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .finding-reco {
      background-color: #fee2e2;
      color: #7f1d1d;
      padding: 6px 8px;
      border-radius: 4px;
      margin-top: 6px;
      font-weight: 600;
    }
    
    /* Table Grid */
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .grid-table th, .grid-table td {
      border: 1px solid #94a3b8;
      padding: 8px;
      font-size: 9px;
      text-align: left;
    }
    .grid-table th {
      background-color: #e2e8f0;
      font-weight: bold;
    }
    .grid-table tfoot {
      background-color: #f8fafc;
      font-weight: bold;
    }
    
    /* Photo Evidence Grid */
    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
      margin-bottom: 15px;
    }
    .photo-item {
      width: 31%;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px;
      background-color: #f8fafc;
      box-sizing: border-box;
      page-break-inside: avoid;
    }
    .photo-img {
      width: 100%;
      aspect-ratio: 4/3;
      object-cover: cover;
      border-radius: 2px;
    }
    .photo-caption {
      font-size: 8px;
      color: #64748b;
      margin-top: 4px;
      font-weight: bold;
      text-align: center;
    }
    
    /* Signatures Section */
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      border-top: 1px solid #64748b;
      text-align: center;
      padding-top: 8px;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }
    .signature-img {
      max-height: 50px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-header">
      <h1 class="cover-title">{{schema.title}}</h1>
      <p class="cover-subtitle">COMPLIANCE ASSURANCE AUDIT REPORT</p>
    </div>
    
    <div class="cover-middle">
      <div class="score-circle">{{score}}%</div>
      <div class="score-label">Compliance Score</div>
    </div>
    
    <table class="metadata-table">
      <tr>
        <td class="label">Client Name</td>
        <td>{{session.clientName}}</td>
      </tr>
      <tr>
        <td class="label">Audit Site / Branch</td>
        <td>{{session.siteName}}</td>
      </tr>
      <tr>
        <td class="label">Physical Address</td>
        <td>{{session.siteAddress}}</td>
      </tr>
      <tr>
        <td class="label">Auditor Lead</td>
        <td>{{session.auditorName}}</td>
      </tr>
      <tr>
        <td class="label">Date of Inspection</td>
        <td>{{dateString}}</td>
      </tr>
    </table>
  </div>

  <!-- Dynamic Content Builder Loop -->
  {{#each schema.components}}
    
    {{#if (eq type 'header')}}
      <div class="section-title-bar">
        <h2 class="section-title">{{title}}</h2>
      </div>
      {{#if subtitle}}
        <div style="font-weight: bold; color: #475569; margin-bottom: 5px; font-size: 11px;">{{subtitle}}</div>
      {{/if}}
      {{#if description}}
        <div style="color: #64748b; margin-bottom: 15px; font-size: 10px;">{{description}}</div>
      {{/if}}
    {{/if}}

    {{#if (eq type 'rich_content')}}
      <div class="rich-content">
        {{{content}}}
      </div>
    {{/if}}

    {{#if (eq type 'checklist')}}
      {{#with (getAnswer ../session.responses id) as |resp|}}
        <table class="checklist-table">
          <thead>
            <tr>
              <th style="width: 75%;">Checklist Question / Compliance Checkpoint</th>
              <th style="width: 12%; text-align: center;">Status</th>
              <th style="width: 13%; text-align: center;">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {{#each ../items}}
              {{#with (getChecklistItemAnswer resp id) as |ans|}}
                <tr>
                  <td>{{question}}</td>
                  <td class="status-cell" style="color: {{#if (eq value 'YES')}}#10b981{{else}}{{#if (eq value 'NO')}}#ef4444{{else}}#64748b{{/if}}{{/if}};">
                    {{#if value}}{{value}}{{else}}-{{/if}}
                  </td>
                  <td style="text-align: center; font-weight: bold;">{{riskLevel}}</td>
                </tr>
              {{/with}}
            {{/each}}
          </tbody>
        </table>

        <!-- Render non-compliant details below the table -->
        {{#each ../items}}
          {{#with (getChecklistItemAnswer resp id) as |ans|}}
            {{#if (eq value 'NO')}}
              <div class="finding-box">
                <div class="finding-header">
                  <span>Finding: {{../question}}</span>
                  <span>Risk: {{../riskLevel}}</span>
                </div>
                {{#if remarks}}
                  <div style="font-size: 9.5px; margin-bottom: 4px;"><strong>Remarks:</strong> {{remarks}}</div>
                {{/if}}
                <div class="finding-reco"><strong>Recommendation:</strong> {{recommendation}}</div>
                
                <!-- Photos attached to this checkpoint -->
                {{#if photos.length}}
                  <div class="photo-grid">
                    {{#each photos}}
                      <div class="photo-item">
                        <img src="{{this}}" class="photo-img" />
                        <div class="photo-caption">Evidence Photo</div>
                      </div>
                    {{/each}}
                  </div>
                {{/if}}
              </div>
            {{/if}}
          {{/with}}
        {{/each}}
      {{/with}}
    {{/if}}

    {{#if (eq type 'yes_no_na')}}
      {{#with (getAnswer ../session.responses id) as |resp|}}
        <div class="section-container" style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
          <div style="font-weight: bold; font-size: 10.5px; color: #1e3a8a;">{{title}}</div>
          <div style="margin-top: 6px;">
            Status Check: 
            <span class="badge {{#if (eq resp.yesNoNa 'YES')}}badge-low{{else}}{{#if (eq resp.yesNoNa 'NO')}}badge-high{{else}}badge-primary{{/if}}{{/if}}">
              {{#if resp.yesNoNa}}{{resp.yesNoNa}}{{else}}Unanswered{{/if}}
            </span>
          </div>
          {{#if (eq resp.yesNoNa 'NO')}}
            <div class="finding-reco" style="margin-top: 8px;">
              <strong>Recommendation:</strong> {{resp.observationAnswer.recommendation}}
            </div>
          {{/if}}
        </div>
      {{/with}}
    {{/if}}

    {{#if (eq type 'observation')}}
      {{#with (getAnswer ../session.responses id) as |resp|}}
        <div class="section-container" style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; color: #0f172a;">{{title}}</div>
          <div style="font-style: italic; color: #475569; margin-bottom: 8px;">Question: {{../question}}</div>
          <div style="background-color: #f8fafc; padding: 8px; border-radius: 4px; border-left: 3px solid #64748b; font-size: 10px;">
            {{#if resp.observationAnswer.answer}}{{resp.observationAnswer.answer}}{{else}}No answer provided.{{/if}}
          </div>
          {{#if resp.photos.length}}
            <div class="photo-grid">
              {{#each resp.photos}}
                <div class="photo-item">
                  <img src="{{base64Data}}" class="photo-img" />
                  <div class="photo-caption">{{caption}}</div>
                </div>
              {{/each}}
            </div>
          {{/if}}
        </div>
      {{/with}}
    {{/if}}

    {{#if (eq type 'table_grid')}}
      {{#with (getAnswer ../session.responses id) as |resp|}}
        <div class="section-container">
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 11px; text-transform: uppercase;">{{../title}}</div>
          <table class="grid-table">
            <thead>
              <tr>
                {{#each ../columns}}
                  <th>{{header}}</th>
                {{/each}}
              </tr>
            </thead>
            <tbody>
              <!-- Row templates computed dynamically inside server code -->
              {{{../renderedGridRows}}}
            </tbody>
          </table>
        </div>
      {{/with}}
    {{/if}}

    {{#if (eq type 'image_upload')}}
      {{#with (getAnswer ../session.responses id) as |resp|}}
        {{#if resp.photos.length}}
          <div class="section-container">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 11px; text-transform: uppercase;">{{../title}}</div>
            <div class="photo-grid">
              {{#each resp.photos}}
                <div class="photo-item" style="width: 48%;">
                  <img src="{{base64Data}}" class="photo-img" />
                  <div class="photo-caption">{{caption}}</div>
                </div>
              {{/each}}
            </div>
          </div>
        {{/if}}
      {{/with}}
    {{/if}}

    {{#if (eq type 'signature')}}
      {{#with (getAnswer ../session.responses id) as |resp|}}
        <div class="section-container">
          <div style="font-weight: bold; margin-bottom: 5px; font-size: 10.5px;">{{../title}}</div>
          <div style="background-color: #fafafa; border: 1px solid #e2e8f0; width: 220px; height: 100px; display: flex; items-center: center; justify-content: center; border-radius: 6px;">
            {{#if resp.signatureBase64}}
              <img src="{{resp.signatureBase64}}" style="max-height: 85px; max-width: 200px; object-fit: contain;" />
            {{else}}
              <div style="font-size: 9px; color: #94a3b8; line-height: 100px; text-align: center; width: 100%;">No signature captured.</div>
            {{/if}}
          </div>
        </div>
      {{/with}}
    {{/if}}

  {{/each}}

  <!-- Standard report footer blocks -->
  <div class="signature-row">
    <div class="signature-box">
      LEAD INSPECTOR AUTHORIZED SIGNATURE
    </div>
    <div class="signature-box">
      CLIENT MANAGER ACKNOWLEDGEMENT
    </div>
  </div>

</body>
</html>
`;

export async function generatePdf(schema: DynamicChecklistSchema, session: DynamicAuditSession): Promise<Buffer> {
  // 1. Calculate Score
  let score = 100;
  schema.components.forEach(comp => {
    if (comp.type === 'checklist') {
      const resp = session.responses.find(r => r.componentId === comp.id);
      comp.items.forEach(item => {
        const ans = resp?.checklistAnswers?.find(a => a.itemId === item.id);
        if (ans?.value === 'NO') {
          if (item.riskLevel === 'HIGH') score -= 15;
          else if (item.riskLevel === 'MEDIUM') score -= 8;
          else if (item.riskLevel === 'LOW') score -= 3;
        }
      });
    } else if (comp.type === 'yes_no_na') {
      const resp = session.responses.find(r => r.componentId === comp.id);
      if (resp?.yesNoNa === 'NO') {
        score -= 10;
      }
    }
  });
  score = Math.max(0, score);

  // 2. Pre-render table grids to raw HTML rows
  schema.components.forEach(comp => {
    if (comp.type === 'table_grid') {
      const resp = session.responses.find(r => r.componentId === comp.id);
      const rowsMap: Record<string, Record<string, string>> = {};
      
      // Group cells by row
      resp?.tableRows?.forEach(cell => {
        if (!rowsMap[cell.rowId]) rowsMap[cell.rowId] = {};
        rowsMap[cell.rowId][cell.colId] = cell.value;
      });

      const rowIds = Object.keys(rowsMap);
      let renderedRows = '';

      if (rowIds.length === 0) {
        renderedRows = `<tr><td colspan="${comp.columns.length}" style="text-align: center; color: #94a3b8; padding: 12px;">No grid data recorded.</td></tr>`;
      } else {
        rowIds.forEach(rowId => {
          renderedRows += '<tr>';
          comp.columns.forEach(col => {
            const val = rowsMap[rowId][col.id] || '';
            renderedRows += `<td style="padding: 6px 8px;">${val}</td>`;
          });
          renderedRows += '</tr>';
        });
      }

      // Append calculated footers
      const hasCalcs = comp.columns.some(col => col.calculation && col.calculation !== 'NONE');
      if (hasCalcs) {
        renderedRows += '<tr style="font-weight: bold; background-color: #f8fafc; border-top: 1px solid #64748b;">';
        comp.columns.forEach(col => {
          if (!col.calculation || col.calculation === 'NONE') {
            renderedRows += '<td style="padding: 6px 8px;"></td>';
            return;
          }
          const numericVals = rowIds
            .map(rId => parseFloat(rowsMap[rId][col.id]))
            .filter(v => !isNaN(v));

          let footValue = '-';
          if (numericVals.length > 0) {
            if (col.calculation === 'SUM') {
              footValue = `Sum: ${numericVals.reduce((a, b) => a + b, 0).toFixed(1)}`;
            } else if (col.calculation === 'AVG') {
              const sum = numericVals.reduce((a, b) => a + b, 0);
              footValue = `Avg: ${(sum / numericVals.length).toFixed(1)}`;
            } else if (col.calculation === 'PRODUCT') {
              footValue = `Prod: ${numericVals.reduce((a, b) => a * b, 1).toFixed(1)}`;
            }
          }
          renderedRows += `<td style="padding: 6px 8px; font-family: monospace;">${footValue}</td>`;
        });
        renderedRows += '</tr>';
      }

      // Assign to schema component temporary property for Handlebars helper to retrieve
      (comp as any).renderedGridRows = renderedRows;
    }
  });

  const dateString = session.completedAt 
    ? new Date(session.completedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
    : new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

  // 3. Compile layout
  const template = Handlebars.compile(PDF_TEMPLATE);
  const htmlContent = template({
    schema,
    session,
    score,
    dateString
  });

  // 4. Launch Puppeteer
  let browser;
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless === 'shell' ? true : chromium.headless,
    });
  } else {
    const localPuppeteer = (await import('puppeteer')).default;
    browser = await localPuppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    // Generate PDF Buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        bottom: '18mm',
        left: '15mm',
        right: '15mm'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
