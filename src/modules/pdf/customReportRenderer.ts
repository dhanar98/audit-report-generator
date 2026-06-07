import puppeteer from 'puppeteer-core';
import { ReportSchema, ReportComponentSchema } from '@/types/reportSchema';
import { DynamicAuditSession, DynamicComponentResponse, DynamicChecklistSchema } from '@/types/dynamicSchema';

// Helper: Calculate safety scorecard metrics
export function calculateSafetyMetrics(checklistSchema: DynamicChecklistSchema, session: DynamicAuditSession) {
  let score = 100;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  let totalNonCompliant = 0;
  let totalChecks = 0;

  checklistSchema.components.forEach(comp => {
    if (comp.type === 'checklist') {
      const resp = session.responses.find(r => r.componentId === comp.id);
      comp.items.forEach(item => {
        totalChecks++;
        const ans = resp?.checklistAnswers?.find(a => a.itemId === item.id);
        if (ans?.value === 'NO') {
          totalNonCompliant++;
          if (item.riskLevel === 'HIGH') {
            score -= 15;
            highRiskCount++;
          } else if (item.riskLevel === 'MEDIUM') {
            score -= 8;
            mediumRiskCount++;
          } else if (item.riskLevel === 'LOW') {
            score -= 3;
            lowRiskCount++;
          }
        }
      });
    } else if (comp.type === 'yes_no_na') {
      totalChecks++;
      const resp = session.responses.find(r => r.componentId === comp.id);
      if (resp?.yesNoNa === 'NO') {
        totalNonCompliant++;
        score -= 10;
        highRiskCount++; // Assume high risk for generic failures
      }
    }
  });

  return {
    score: Math.max(0, score),
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    totalNonCompliant,
    totalChecks
  };
}

// Helper: Evaluate report component visibility rules
function evaluateVisibility(comp: ReportComponentSchema, metrics: any, session: DynamicAuditSession): boolean {
  if (!comp.visibilityRules || comp.visibilityRules.condition === 'always') {
    return true;
  }

  const { condition, scoreComparison, targetScore, targetComponentId, targetValue } = comp.visibilityRules;

  if (condition === 'on_compliance_score') {
    const currentScore = metrics.score;
    const target = targetScore ?? 0;
    switch (scoreComparison) {
      case 'lt': return currentScore < target;
      case 'lte': return currentScore <= target;
      case 'gt': return currentScore > target;
      case 'gte': return currentScore >= target;
      case 'eq': return currentScore === target;
      default: return true;
    }
  }

  if (condition === 'on_component_value' && targetComponentId) {
    const resp = session.responses.find(r => r.componentId === targetComponentId);
    if (!resp) return false;
    
    // Check various response value fields
    const actualValue = resp.value || resp.yesNoNa || '';
    return actualValue === targetValue;
  }

  return true;
}

// Custom Report HTML Generator
export function generateReportHtml(
  reportSchema: ReportSchema,
  session: DynamicAuditSession,
  checklistSchema: DynamicChecklistSchema
): string {
  const metrics = calculateSafetyMetrics(checklistSchema, session);
  const dateString = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
    : new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

  let componentsHtml = '';
  
  // Render each visible component
  reportSchema.components.forEach(comp => {
    if (!evaluateVisibility(comp, metrics, session)) {
      return; // Skip hidden component
    }

    const style = comp.style || {};
    const themeColor = style.themeColor || '#1e3a8a';
    const accentColor = style.accentColor || '#3b82f6';
    const alignClass = style.alignment ? `text-align: ${style.alignment};` : '';
    const layout = comp.layout || {};
    const colSpanClass = layout.colSpan === 1 ? 'col-span-half' : 'col-span-full';
    
    const spacingStyle = `margin-top: ${layout.marginTop || 10}px; margin-bottom: ${layout.marginBottom || 10}px;`;

    let contentHtml = '';

    switch (comp.type) {
      case 'cover_page':
        contentHtml = `
          <div class="cover-page" style="${spacingStyle}">
            <div class="cover-header" style="border-bottom: 3px solid ${themeColor};">
              <h1 class="cover-title" style="color: ${themeColor}; ${alignClass}">${comp.title}</h1>
              ${comp.subtitle ? `<p class="cover-subtitle" style="${alignClass}">${comp.subtitle}</p>` : ''}
            </div>
            <div class="cover-middle">
              <div class="score-circle" style="border-color: ${accentColor}; color: ${themeColor}; background-color: ${accentColor}10;">${metrics.score}%</div>
              <div class="score-label">Inspection Compliance Score</div>
            </div>
            <table class="metadata-table">
              <tr><td class="label">Client Corporate</td><td>${session.clientName || 'N/A'}</td></tr>
              <tr><td class="label">Audited Site Branch</td><td>${session.siteName || 'N/A'}</td></tr>
              ${session.siteAddress ? `<tr><td class="label">Site Address</td><td>${session.siteAddress}</td></tr>` : ''}
              <tr><td class="label">Lead Auditor Inspector</td><td>${session.auditorName || 'N/A'}</td></tr>
              <tr><td class="label">Report Generated At</td><td>${dateString}</td></tr>
            </table>
          </div>
        `;
        break;

      case 'document_info':
        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            <table class="metadata-table">
              <tr>
                <td class="label">Client corporate entity</td><td>${session.clientName || 'N/A'}</td>
                <td class="label">Lead compliance inspector</td><td>${session.auditorName || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Location site branch</td><td>${session.siteName || 'N/A'}</td>
                <td class="label">Audit completion date</td><td>${dateString}</td>
              </tr>
            </table>
          </div>
        `;
        break;

      case 'table_of_contents':
        const tocItems = reportSchema.components
          .filter(c => c.type !== 'cover_page' && c.type !== 'page_break' && evaluateVisibility(c, metrics, session))
          .map((c, i) => `
            <div class="toc-row">
              <span class="toc-title">${c.title}</span>
              <span class="toc-dots">...........................................................................................................................................</span>
              <span class="toc-page">${i + 2}</span>
            </div>
          `).join('');

        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            <div class="toc-container">
              ${tocItems}
            </div>
          </div>
        `;
        break;

      case 'executive_summary':
      case 'rich_content':
      case 'conclusion':
      case 'appendix':
        contentHtml = `
          <div class="section-container ${colSpanClass}" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            <div class="rich-content">
              ${comp.content || '<p>No content provided.</p>'}
            </div>
          </div>
        `;
        break;

      case 'kpi_summary':
        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            <div class="kpi-grid">
              <div class="kpi-card">
                <span class="kpi-val" style="color: ${metrics.score >= 85 ? '#10b981' : metrics.score >= 60 ? '#f5a623' : '#ef4444'};">${metrics.score}%</span>
                <span class="kpi-lbl">Safety score</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-val" style="color: #ef4444;">${metrics.highRiskCount}</span>
                <span class="kpi-lbl">High severity risk violations</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-val" style="color: #f5a623;">${metrics.mediumRiskCount}</span>
                <span class="kpi-lbl">Medium severity risks</span>
              </div>
              <div class="kpi-card">
                <span class="kpi-val" style="color: #64748b;">${metrics.lowRiskCount}</span>
                <span class="kpi-lbl">Low compliance advisories</span>
              </div>
            </div>
          </div>
        `;
        break;

      case 'measurement_table':
        const sourceGridId = comp.dataMapping?.sourceComponentId;
        const gridResp = session.responses.find(r => r.componentId === sourceGridId);
        const gridComp = checklistSchema.components.find(c => c.id === sourceGridId);

        if (gridResp && gridComp && gridComp.type === 'table_grid') {
          const rowsMap: Record<string, Record<string, string>> = {};
          gridResp.tableRows?.forEach(cell => {
            if (!rowsMap[cell.rowId]) rowsMap[cell.rowId] = {};
            rowsMap[cell.rowId][cell.colId] = cell.value;
          });

          const rowIds = Object.keys(rowsMap);
          let gridRowsHtml = '';

          if (rowIds.length === 0) {
            gridRowsHtml = `<tr><td colspan="${gridComp.columns.length}" style="text-align: center; color: #94a3b8; padding: 12px;">No grid readings recorded.</td></tr>`;
          } else {
            rowIds.forEach(rowId => {
              gridRowsHtml += '<tr>';
              gridComp.columns.forEach(col => {
                const val = rowsMap[rowId][col.id] || '';
                gridRowsHtml += `<td>${val}</td>`;
              });
              gridRowsHtml += '</tr>';
            });
          }

          // Summary footer calculations
          const hasCalculations = gridComp.columns.some(col => col.calculation && col.calculation !== 'NONE');
          if (hasCalculations) {
            gridRowsHtml += '<tr style="font-weight: bold; background-color: #f8fafc; border-top: 1.5px solid #475569;">';
            gridComp.columns.forEach(col => {
              if (!col.calculation || col.calculation === 'NONE') {
                gridRowsHtml += '<td></td>';
                return;
              }
              const numbers = rowIds
                .map(rId => parseFloat(rowsMap[rId][col.id]))
                .filter(v => !isNaN(v));

              let footStr = '-';
              if (numbers.length > 0) {
                if (col.calculation === 'SUM') {
                  footStr = `Sum: ${numbers.reduce((a, b) => a + b, 0).toFixed(1)}`;
                } else if (col.calculation === 'AVG') {
                  const sum = numbers.reduce((a, b) => a + b, 0);
                  footStr = `Avg: ${(sum / numbers.length).toFixed(1)}`;
                } else if (col.calculation === 'PRODUCT') {
                  footStr = `Prod: ${numbers.reduce((a, b) => a * b, 1).toFixed(1)}`;
                }
              }
              gridRowsHtml += `<td style="font-family: monospace;">${footStr}</td>`;
            });
            gridRowsHtml += '</tr>';
          }

          contentHtml = `
            <div class="section-container" style="${spacingStyle}">
              <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
              <table class="grid-table">
                <thead>
                  <tr>
                    ${gridComp.columns.map(col => `<th>${col.header}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${gridRowsHtml}
                </tbody>
              </table>
            </div>
          `;
        } else {
          contentHtml = `
            <div class="section-container" style="${spacingStyle}">
              <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
              <div class="rich-content" style="text-align: center; color: #94a3b8;">
                Linked data grid component "${sourceGridId}" not found or contains no answers.
              </div>
            </div>
          `;
        }
        break;

      case 'observation_matrix':
      case 'recommendation_matrix':
        const isReco = comp.type === 'recommendation_matrix';
        const filterType = comp.dataMapping?.observationFilter || 'NON_COMPLIANT';
        let itemsHtml = '';

        checklistSchema.components.forEach(checkComp => {
          if (checkComp.type === 'checklist') {
            const cResp = session.responses.find(r => r.componentId === checkComp.id);
            checkComp.items.forEach(item => {
              const ans = cResp?.checklistAnswers?.find(a => a.itemId === item.id);
              const statusVal = ans?.value || '';

              // Filter checks
              if (filterType === 'NON_COMPLIANT' && statusVal !== 'NO') return;
              if (filterType === 'COMPLIANT' && statusVal !== 'YES') return;
              if (filterType === 'ALL' && statusVal === '') return;

              let photosHtml = '';
              if (!isReco && ans?.photos && ans.photos.length > 0) {
                photosHtml = `
                  <div class="photo-grid" style="margin-top: 8px;">
                    ${ans.photos.map(p => `
                      <div class="photo-item" style="width: 23%;">
                        <img src="${p}" class="photo-img" />
                      </div>
                    `).join('')}
                  </div>
                `;
              }

              itemsHtml += `
                <div class="finding-card ${statusVal === 'NO' ? 'finding-fail' : 'finding-pass'}" style="page-break-inside: avoid; margin-bottom: 10px;">
                  <div class="finding-card-header">
                    <strong>${item.question}</strong>
                    <span class="badge ${statusVal === 'YES' ? 'badge-low' : statusVal === 'NO' ? 'badge-high' : 'badge-primary'}">${statusVal}</span>
                  </div>
                  ${ans?.remarks ? `<p class="finding-remarks"><strong>Observation Remarks:</strong> ${ans.remarks}</p>` : ''}
                  ${isReco || comp.dataMapping?.includeRecommendations ? `
                    <div class="finding-reco-box">
                      <strong>Corrective Action Recommendation:</strong> ${ans?.recommendation || 'Remediate compliance hazard immediately.'}
                      ${item.targetResolveDays ? `<span style="float: right; font-weight: bold; font-size: 8.5px;">Target Resolve: ${item.targetResolveDays} days</span>` : ''}
                    </div>
                  ` : ''}
                  ${photosHtml}
                </div>
              `;
            });
          }
        });

        if (!itemsHtml) {
          itemsHtml = `<div style="text-align: center; color: #64748b; padding: 20px; font-style: italic;">No audit findings matching current safety criteria.</div>`;
        }

        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            ${itemsHtml}
          </div>
        `;
        break;

      case 'photo_gallery':
        const photoSourceId = comp.dataMapping?.sourceComponentId;
        const uploadResp = session.responses.find(r => r.componentId === photoSourceId);
        let galleryHtml = '';

        if (uploadResp && uploadResp.photos && uploadResp.photos.length > 0) {
          galleryHtml = `
            <div class="photo-grid">
              ${uploadResp.photos.map(p => `
                <div class="photo-item" style="width: 31%;">
                  <img src="${p.base64Data}" class="photo-img" />
                  ${p.caption ? `<div class="photo-caption">${p.caption}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `;
        } else {
          galleryHtml = `<div style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">No photographs uploaded.</div>`;
        }

        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            ${galleryHtml}
          </div>
        `;
        break;

      case 'image_comparison':
        // Put all audit session photos side by side
        const allPhotos: { base64Data: string; caption?: string }[] = [];
        session.responses.forEach(r => {
          if (r.photos) {
            r.photos.forEach(p => allPhotos.push(p));
          }
          if (r.checklistAnswers) {
            r.checklistAnswers.forEach(ans => {
              if (ans.photos) {
                ans.photos.forEach(p => allPhotos.push({ base64Data: p, caption: 'Evidence Check' }));
              }
            });
          }
        });

        let comparisonRows = '';
        for (let i = 0; i < allPhotos.length; i += 2) {
          const first = allPhotos[i];
          const second = allPhotos[i + 1];
          comparisonRows += `
            <div class="comparison-row" style="display: flex; gap: 12px; margin-bottom: 12px; page-break-inside: avoid;">
              <div style="flex: 1; border: 1px solid #e2e8f0; padding: 5px; background: #f8fafc; border-radius: 4px;">
                <img src="${first.base64Data}" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 2px;" />
                <div style="font-size: 8.5px; text-align: center; font-weight: bold; margin-top: 4px; color: #64748b;">${first.caption || 'Before'}</div>
              </div>
              <div style="flex: 1; border: 1px solid #e2e8f0; padding: 5px; background: #f8fafc; border-radius: 4px;">
                ${second ? `
                  <img src="${second.base64Data}" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 2px;" />
                  <div style="font-size: 8.5px; text-align: center; font-weight: bold; margin-top: 4px; color: #64748b;">${second.caption || 'After / Alternative'}</div>
                ` : `<div style="height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">No comparative photo recorded</div>`}
              </div>
            </div>
          `;
        }

        if (allPhotos.length === 0) {
          comparisonRows = `<div style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">No audit photographs found.</div>`;
        }

        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            ${comparisonRows}
          </div>
        `;
        break;

      case 'signature_block':
        let signaturesHtml = '';
        
        checklistSchema.components.forEach(checkComp => {
          if (checkComp.type === 'signature') {
            const sigResp = session.responses.find(r => r.componentId === checkComp.id);
            if (sigResp && sigResp.signatureBase64) {
              signaturesHtml += `
                <div style="width: 45%; text-align: center; margin-bottom: 20px;">
                  <img src="${sigResp.signatureBase64}" style="max-height: 50px; max-width: 180px; object-fit: contain; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;" />
                  <div style="font-size: 10px; font-weight: bold; color: #475569;">${checkComp.title}</div>
                  <div style="font-size: 8.5px; color: #64748b;">Digitally Type-Certified</div>
                </div>
              `;
            }
          }
        });

        if (!signaturesHtml) {
          // Fallback placeholders
          signaturesHtml = `
            <div style="width: 45%; border-top: 1.5px solid #475569; text-align: center; padding-top: 8px;">
              <div style="font-weight: bold; font-size: 10px; color: #475569;">LEAD COMPLIANCE INSPECTOR</div>
              <div style="font-size: 8.5px; color: #94a3b8; margin-top: 25px;">Type Name & Date</div>
            </div>
            <div style="width: 45%; border-top: 1.5px solid #475569; text-align: center; padding-top: 8px;">
              <div style="font-weight: bold; font-size: 10px; color: #475569;">CLIENT REPRESENTATIVE</div>
              <div style="font-size: 8.5px; color: #94a3b8; margin-top: 25px;">Sign-off Authorization</div>
            </div>
          `;
        }

        contentHtml = `
          <div class="section-container" style="${spacingStyle}">
            <h3 class="section-heading" style="color: ${themeColor}; border-bottom: 2px solid ${themeColor};">${comp.title}</h3>
            <div style="display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid;">
              ${signaturesHtml}
            </div>
          </div>
        `;
        break;

      case 'page_break':
        contentHtml = `<div class="page-break-divider"></div>`;
        break;

      default:
        break;
    }

    componentsHtml += contentHtml;
    if (layout.pageBreakAfter && comp.type !== 'page_break') {
      componentsHtml += `<div class="page-break-divider"></div>`;
    }
  });

  // Final HTML scaffolding
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportSchema.title} - ${session.clientName || 'VeriAudit'}</title>
      <style>
        @page {
          size: A4;
          margin: 18mm 15mm;
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.4;
          font-size: 10.5px;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
        }
        
        /* Layout Grid */
        .col-span-full { width: 100%; clear: both; }
        .col-span-half { width: 48%; float: left; margin-right: 2%; box-sizing: border-box; }
        .page-break-divider { page-break-after: always; clear: both; }

        /* Cover Page */
        .cover-page {
          height: 245mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          padding: 30px 10px;
          box-sizing: border-box;
          clear: both;
        }
        .cover-header {
          padding-bottom: 12px;
        }
        .cover-title {
          font-size: 25px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0 0 6px 0;
          letter-spacing: 0.5px;
        }
        .cover-subtitle {
          font-size: 12px;
          color: #475569;
          margin: 0;
          font-weight: 600;
        }
        .cover-middle {
          text-align: center;
          margin: 60px 0;
        }
        .score-circle {
          display: inline-block;
          border: 4px solid #3b82f6;
          border-radius: 50%;
          width: 120px;
          height: 120px;
          line-height: 112px;
          text-align: center;
          font-size: 30px;
          font-weight: 900;
        }
        .score-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #64748b;
          font-weight: bold;
          margin-top: 12px;
        }
        
        /* Tables */
        .metadata-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .metadata-table td {
          padding: 8px 10px;
          border: 1px solid #cbd5e1;
          font-size: 10.5px;
        }
        .metadata-table td.label {
          font-weight: 700;
          background-color: #f8fafc;
          width: 30%;
          color: #334155;
        }

        .section-container {
          margin-bottom: 20px;
          page-break-inside: avoid;
          clear: both;
        }
        .section-heading {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          padding-bottom: 4px;
          margin-top: 20px;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }

        .rich-content {
          padding: 10px;
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 9.5px;
          color: #334155;
        }

        /* KPI Dashboard cards */
        .kpi-grid {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .kpi-card {
          flex: 1;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
          text-align: center;
        }
        .kpi-val {
          font-size: 18px;
          font-weight: 900;
          display: block;
        }
        .kpi-lbl {
          font-size: 8.5px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: bold;
          margin-top: 4px;
          display: block;
        }

        /* Checkpoint & observation matrix */
        .finding-card {
          border-radius: 5px;
          padding: 10px;
          margin-bottom: 10px;
          border: 1.5px solid transparent;
        }
        .finding-fail {
          background-color: #fdf2f2;
          border-color: #fca5a5;
        }
        .finding-pass {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
        }
        .finding-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .finding-remarks {
          margin: 0;
          font-size: 9.5px;
          color: #334155;
        }
        .finding-reco-box {
          background-color: rgba(0,0,0,0.03);
          padding: 6px;
          border-radius: 3px;
          margin-top: 6px;
          font-size: 9.5px;
        }

        /* Table Grid components */
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .grid-table th, .grid-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          font-size: 9px;
        }
        .grid-table th {
          background-color: #f1f5f9;
          font-weight: bold;
        }

        /* Table of Contents */
        .toc-container {
          background-color: #fafafa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
        }
        .toc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 10px;
        }
        .toc-title { font-weight: bold; color: #1e3a8a; }
        .toc-dots { flex: 1; margin: 0 10px; color: #cbd5e1; overflow: hidden; white-space: nowrap; }
        .toc-page { font-weight: bold; }

        /* Photo grids */
        .photo-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .photo-item {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 4px;
          background: #fafafa;
          box-sizing: border-box;
        }
        .photo-img {
          width: 100%;
          aspect-ratio: 4/3;
          object-fit: cover;
          border-radius: 2px;
        }
        .photo-caption {
          font-size: 8px;
          text-align: center;
          color: #64748b;
          font-weight: bold;
          margin-top: 4px;
        }

        /* Badges */
        .badge {
          font-size: 8.5px;
          font-weight: 700;
          padding: 1.5px 5px;
          border-radius: 3px;
          display: inline-block;
        }
        .badge-primary { background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
        .badge-high { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .badge-low { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }

      </style>
    </head>
    <body>
      ${componentsHtml}
    </body>
    </html>
  `;
}

// Generate PDF Buffer using Puppeteer
export async function generateCustomPdf(
  reportSchema: ReportSchema,
  session: DynamicAuditSession,
  checklistSchema: DynamicChecklistSchema
): Promise<Buffer> {
  const htmlContent = generateReportHtml(reportSchema, session, checklistSchema);

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
