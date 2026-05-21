import { NextRequest, NextResponse } from 'next/server';
import Handlebars from 'handlebars';
import { ChecklistSchema, AuditSessionData, TemplateFieldSchema } from '../../../types/schema';

// Handlebars HTML Template matching the Indian Bank Word structure
const REPORT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VeriAudit Pro - Compliance PDF Report</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      padding: 40px;
      background-color: #ffffff;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .cover-page {
      text-align: center;
      padding: 100px 0;
      page-break-after: always;
      break-after: page;
    }
    
    .cover-title {
      font-size: 28px;
      font-weight: 800;
      color: #6366f1;
      text-transform: uppercase;
      margin-bottom: 20px;
      letter-spacing: 1px;
    }
    
    .cover-subtitle {
      font-size: 16px;
      color: #64748b;
      margin-bottom: 80px;
    }
    
    .metadata-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 13px;
    }
    
    .metadata-table td {
      padding: 12px;
      border: 1px solid #e2e8f0;
    }
    
    .metadata-table td.label {
      font-weight: 700;
      background-color: #f8fafc;
      width: 40%;
      color: #334155;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e1b4b;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 8px;
      margin-top: 40px;
      margin-bottom: 20px;
      page-break-after: avoid;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 10px;
      text-align: left;
    }
    
    .data-table th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
    }
    
    .finding-card {
      border: 1px solid #fca5a5;
      background-color: #fef2f2;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .finding-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      border-bottom: 1px solid #fee2e2;
      padding-bottom: 5px;
    }
    
    .finding-title {
      font-size: 13px;
      font-weight: 700;
      color: #991b1b;
    }
    
    .finding-risk {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      background-color: #f87171;
      color: #ffffff;
    }
    
    .finding-desc {
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .finding-reco {
      font-size: 12px;
      font-weight: 600;
      color: #7f1d1d;
      background-color: #fee2e2;
      padding: 8px;
      border-radius: 4px;
    }
    
    .sign-row {
      display: flex;
      justify-content: space-between;
      margin-top: 80px;
      page-break-inside: avoid;
    }
    
    .sign-box {
      width: 45%;
      border-top: 1px solid #94a3b8;
      text-align: center;
      padding-top: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    
    .score-badge {
      font-size: 32px;
      font-weight: 900;
      color: #10b981;
      margin-top: 20px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-title">{{schema.title}}</div>
    <div class="cover-subtitle">COMPLIANCE & ELECTRICAL ENERGY AUDIT REPORT</div>
    
    <div style="margin: 40px 0;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #64748b;">Compliance Score</div>
      <div class="score-badge">{{score}}%</div>
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
        <td class="label">Auditor Lead</td>
        <td>{{session.auditorName}}</td>
      </tr>
      <tr>
        <td class="label">Date of Visit</td>
        <td>{{dateString}}</td>
      </tr>
      <tr>
        <td class="label">Session Identifier</td>
        <td style="font-family: monospace; font-size: 11px;">{{session.id}}</td>
      </tr>
    </table>
  </div>

  <!-- Sections Loop -->
  {{#each schema.sections}}
    {{#if (eq type 'header')}}
      <div class="section-title">{{title}}</div>
      <table class="metadata-table">
        {{#each fields}}
          <tr>
            <td class="label">{{title}}</td>
            <td>{{lookup ../../answers id}}</td>
          </tr>
        {{/each}}
      </table>
    {{/if}}

    {{#if (eq type 'checklist')}}
      <div class="section-title">{{title}}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 70%;">Checkpoint Check Item</th>
            <th style="width: 15%; text-align: center;">Status</th>
            <th style="width: 15%; text-align: center;">Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {{#each fields}}
            <tr>
              <td>{{title}}</td>
              <td style="text-align: center; font-weight: bold; color: {{#if (eq (lookup ../../answers id) 'YES')}}#10b981{{else}}{{#if (eq (lookup ../../answers id) 'NO')}}#ef4444{{else}}#64748b{{/if}}{{/if}};">
                {{lookup ../../answers id}}
              </td>
              <td style="text-align: center;">{{riskLevel}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    {{/if}}

    {{#if (eq type 'table')}}
      {{#each tables}}
        <div class="section-title">{{title}}</div>
        <table class="data-table">
          <thead>
            <tr>
              {{#each columns}}
                <th>{{this}}</th>
              {{/each}}
            </tr>
          </thead>
          <tbody>
            {{#each rows}}
              <tr>
                {{#each this}}
                  <td>{{this}}</td>
                {{/each}}
              </tr>
            {{/each}}
          </tbody>
        </table>
      {{/each}}
    {{/if}}
  {{/each}}

  <!-- Risk Findings / Observations Section -->
  <div class="section-title">Non-Compliant Findings & Recommendations</div>
  {{#if hasFailures}}
    {{#each failures}}
      <div class="finding-card">
        <div class="finding-header">
          <span class="finding-title">{{title}}</span>
          <span class="finding-risk">Risk: {{riskLevel}}</span>
        </div>
        {{#if remarks}}
          <div class="finding-desc"><strong>Observation Remarks:</strong> {{remarks}}</div>
        {{/if}}
        <div class="finding-reco"><strong>Remediation Recommendation:</strong> {{recommendation}}</div>
      </div>
    {{/each}}
  {{else}}
    <div style="font-size: 13px; color: #10b981; font-weight: 600; padding: 15px; border: 1px solid #10b981; background-color: #ecfdf5; border-radius: 6px;">
      ✔ No non-compliant or failed safety items were identified during this audit inspection.
    </div>
  {{/if}}

  <!-- Signatures block -->
  <div class="sign-row">
    <div class="sign-box">
      AUDITOR SIGNATURE / SEAL
    </div>
    <div class="sign-box">
      BRANCH MANAGER AUTHORIZATION
    </div>
  </div>

</body>
</html>
`;

// Helper registry for handlebars comparison
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

export async function POST(req: NextRequest) {
  try {
    const { schema, session, score } = await req.json() as { 
      schema: ChecklistSchema; 
      session: AuditSessionData;
      score: number;
    };
    
    if (!schema || !session) {
      return NextResponse.json({ error: 'Missing schema or session parameters.' }, { status: 400 });
    }

    // Extract key-value answers lookup map
    const answers: Record<string, string> = {};
    const failures: Array<{ title: string; riskLevel: string; remarks?: string; recommendation: string }> = [];

    session.responses.forEach(resp => {
      answers[resp.fieldId] = resp.value;

      if (resp.value === 'NO') {
        // Find corresponding field in schema
        let fieldTitle = 'Safety Checkpoint Failure';
        let fieldRisk = 'LOW';
        let fieldReco = 'Corrective rectification needed.';
        
        for (const sec of schema.sections) {
          if (sec.fields) {
            const found = sec.fields.find(f => f.id === resp.fieldId);
            if (found) {
              fieldTitle = found.title;
              fieldRisk = found.riskLevel;
              fieldReco = found.recoMapping || fieldReco;
              break;
            }
          }
        }

        failures.push({
          title: fieldTitle,
          riskLevel: fieldRisk,
          remarks: resp.remarks || '',
          recommendation: resp.recommendation || fieldReco
        });
      }
    });

    const dateString = session.completedAt 
      ? new Date(session.completedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
      : new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

    // Compile template
    const template = Handlebars.compile(REPORT_TEMPLATE);
    const htmlOutput = template({
      schema,
      session,
      answers,
      failures,
      hasFailures: failures.length > 0,
      score,
      dateString
    });

    // Return HTML output back to client. The client will load it in a print-ready context.
    return NextResponse.json({ html: htmlOutput });
  } catch (error: any) {
    console.error('Error generating report HTML:', error);
    return NextResponse.json({ error: error.message || 'Report HTML compilation failed.' }, { status: 500 });
  }
}
