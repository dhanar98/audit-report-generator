import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  ImageRun, 
  AlignmentType, 
  HeadingLevel, 
  WidthType
} from 'docx';
import { ReportSchema, ReportComponentSchema } from '@/types/reportSchema';
import { DynamicAuditSession, DynamicChecklistSchema } from '@/types/dynamicSchema';
import { calculateSafetyMetrics } from '../pdf/customReportRenderer';

// Helpers to extract base64 data safely
function getBase64Buffer(base64Str: string): Buffer | null {
  try {
    if (!base64Str.includes('base64,')) return null;
    const parts = base64Str.split('base64,');
    return Buffer.from(parts[1], 'base64');
  } catch (e) {
    return null;
  }
}

// Custom DOCX Report Compiler
export async function generateCustomDocx(
  reportSchema: ReportSchema,
  session: DynamicAuditSession,
  checklistSchema: DynamicChecklistSchema
): Promise<Buffer> {
  const children: any[] = [];
  const metrics = calculateSafetyMetrics(checklistSchema, session);
  const dateString = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
    : new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

  // Compile each component to docx elements
  reportSchema.components.forEach(comp => {
    // 1. Title/Header formatting
    const themeColor = comp.style?.themeColor?.replace('#', '') || '1e3a8a';
    const alignType = comp.style?.alignment === 'center' 
      ? AlignmentType.CENTER 
      : comp.style?.alignment === 'right' 
        ? AlignmentType.RIGHT 
        : AlignmentType.LEFT;

    // Header title row
    if (comp.type !== 'cover_page' && comp.type !== 'page_break') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: comp.layout?.marginTop ? comp.layout.marginTop * 10 : 200, after: 100 },
          alignment: alignType,
          children: [
            new TextRun({
              text: comp.title,
              bold: true,
              color: themeColor,
              size: 26, // 13pt
            })
          ]
        })
      );
      if (comp.subtitle) {
        children.push(
          new Paragraph({
            alignment: alignType,
            children: [new TextRun({ text: comp.subtitle, italics: true, color: "475569" })]
          })
        );
      }
    }

    // 2. Component Type Logic
    switch (comp.type) {
      case 'cover_page':
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 300 },
            children: [
              new TextRun({
                text: comp.title,
                bold: true,
                size: 40, // 20pt
                color: themeColor,
              }),
            ],
          })
        );
        if (comp.subtitle) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 1500 },
              children: [
                new TextRun({
                  text: comp.subtitle,
                  bold: true,
                  size: 24, // 12pt
                  color: "475569",
                }),
              ],
            })
          );
        }

        // Score display
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: `Compliance Score: ${metrics.score}%`,
                bold: true,
                size: 32, // 16pt
                color: metrics.score >= 80 ? "16a34a" : metrics.score >= 60 ? "d97706" : "dc2626",
              }),
            ],
          })
        );

        // Core cover metadata
        children.push(
          new Paragraph({ spacing: { before: 1000 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Client Name", bold: true })] })] }),
                  new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: session.clientName || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Site Location", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: session.siteName || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Lead Inspector", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: session.auditorName || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Inspection Date", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: dateString })] })
                ]
              })
            ]
          })
        );
        break;

      case 'document_info':
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Client corporate", bold: true })] })] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: session.clientName || 'N/A' })] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Inspector lead", bold: true })] })] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: session.auditorName || 'N/A' })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Location site", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: session.siteName || 'N/A' })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Completion Date", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: dateString })] })
                ]
              })
            ]
          })
        );
        break;

      case 'table_of_contents':
        // Render outline list
        reportSchema.components
          .filter(c => c.type !== 'cover_page' && c.type !== 'page_break')
          .forEach((c, i) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${i + 1}. ${c.title}`, bold: true, color: "475569" }),
                  new TextRun({ text: ` ..................................................................................... Page ${i + 2}` })
                ]
              })
            );
          });
        break;

      case 'executive_summary':
      case 'rich_content':
      case 'conclusion':
      case 'appendix':
        const cleanText = (comp.content || '').replace(/<[^>]*>/g, '');
        children.push(
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({ text: cleanText, color: "334155" })
            ]
          })
        );
        break;

      case 'kpi_summary':
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Safety compliance Score", bold: true })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${metrics.score}%`, size: 30, color: "16a34a", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "High Severity Violations", bold: true })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${metrics.highRiskCount}`, size: 30, color: "dc2626", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Medium/Low Severity Risks", bold: true })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${metrics.mediumRiskCount + metrics.lowRiskCount}`, size: 30, color: "d97706", bold: true })] })] })
                ]
              })
            ]
          })
        );
        break;

      case 'measurement_table':
        const sourceGridId = comp.dataMapping?.sourceComponentId;
        const gridResp = session.responses.find(r => r.componentId === sourceGridId);
        const gridComp = checklistSchema.components.find(c => c.id === sourceGridId);

        if (gridResp && gridComp && gridComp.type === 'table_grid') {
          const gridRowsMap: Record<string, Record<string, string>> = {};
          gridResp.tableRows?.forEach(cell => {
            if (!gridRowsMap[cell.rowId]) gridRowsMap[cell.rowId] = {};
            gridRowsMap[cell.rowId][cell.colId] = cell.value;
          });

          const rowIds = Object.keys(gridRowsMap);
          const gridTableRows = [
            new TableRow({
              children: gridComp.columns.map(col => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col.header, bold: true })] })] }))
            })
          ];

          rowIds.forEach(rowId => {
            gridTableRows.push(
              new TableRow({
                children: gridComp.columns.map(col => {
                  const val = gridRowsMap[rowId][col.id] || '';
                  return new TableCell({ children: [new Paragraph({ text: val })] });
                })
              })
            );
          });

          // Summary footer calculations
          const hasCalcs = gridComp.columns.some(col => col.calculation && col.calculation !== 'NONE');
          if (hasCalcs) {
            gridTableRows.push(
              new TableRow({
                children: gridComp.columns.map(col => {
                  if (!col.calculation || col.calculation === 'NONE') {
                    return new TableCell({ children: [new Paragraph({ text: "" })] });
                  }
                  const numericVals = rowIds
                    .map(rId => parseFloat(gridRowsMap[rId][col.id]))
                    .filter(v => !isNaN(v));

                  let footVal = '-';
                  if (numericVals.length > 0) {
                    if (col.calculation === 'SUM') {
                      footVal = `Sum: ${numericVals.reduce((a, b) => a + b, 0).toFixed(1)}`;
                    } else if (col.calculation === 'AVG') {
                      const sum = numericVals.reduce((a, b) => a + b, 0);
                      footVal = `Avg: ${(sum / numericVals.length).toFixed(1)}`;
                    } else if (col.calculation === 'PRODUCT') {
                      footVal = `Prod: ${numericVals.reduce((a, b) => a * b, 1).toFixed(1)}`;
                    }
                  }
                  return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: footVal, bold: true })] })] });
                })
              })
            );
          }

          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: gridTableRows }));
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text: "[No reading data table mapped or captured]", color: "94a3b8" })] }));
        }
        break;

      case 'observation_matrix':
      case 'recommendation_matrix':
        const isReco = comp.type === 'recommendation_matrix';
        const filterType = comp.dataMapping?.observationFilter || 'NON_COMPLIANT';

        checklistSchema.components.forEach(checkComp => {
          if (checkComp.type === 'checklist') {
            const cResp = session.responses.find(r => r.componentId === checkComp.id);
            checkComp.items.forEach(item => {
              const ans = cResp?.checklistAnswers?.find(a => a.itemId === item.id);
              const statusVal = ans?.value || '';

              if (filterType === 'NON_COMPLIANT' && statusVal !== 'NO') return;
              if (filterType === 'COMPLIANT' && statusVal !== 'YES') return;
              if (filterType === 'ALL' && statusVal === '') return;

              children.push(
                new Paragraph({
                  spacing: { before: 150 },
                  children: [
                    new TextRun({ text: `Checkpoint: ${item.question} (${statusVal})`, bold: true, color: statusVal === 'NO' ? "dc2626" : "16a34a" })
                  ]
                })
              );

              if (ans?.remarks) {
                children.push(new Paragraph({ children: [new TextRun({ text: "Observation: ", bold: true }), new TextRun({ text: ans.remarks })] }));
              }

              if (isReco || comp.dataMapping?.includeRecommendations) {
                children.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Recommendation: ", bold: true }),
                      new TextRun({ text: ans?.recommendation || 'Remediate compliance hazard immediately.', color: "991b1b" })
                    ]
                  })
                );
              }

              // Attached checklist photos
              if (!isReco && ans?.photos && ans.photos.length > 0) {
                const photosList: TableCell[] = [];
                ans.photos.forEach(b64 => {
                  const buf = getBase64Buffer(b64);
                  if (buf) {
                    photosList.push(
                      new TableCell({
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new ImageRun({ data: buf, transformation: { width: 140, height: 105 } } as any)]
                          })
                        ]
                      })
                    );
                  }
                });
                if (photosList.length > 0) {
                  children.push(new Table({ rows: [new TableRow({ children: photosList })] }));
                }
              }
            });
          }
        });
        break;

      case 'photo_gallery':
        const photoSourceId = comp.dataMapping?.sourceComponentId;
        const uploadResp = session.responses.find(r => r.componentId === photoSourceId);

        if (uploadResp && uploadResp.photos && uploadResp.photos.length > 0) {
          const photoCells: TableCell[] = [];
          uploadResp.photos.forEach(p => {
            const buf = getBase64Buffer(p.base64Data);
            if (buf) {
              photoCells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new ImageRun({ data: buf, transformation: { width: 150, height: 112 } } as any),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: p.caption || 'Evidence Photo', size: 14, color: "64748b" })] })
                      ]
                    })
                  ]
                })
              );
            }
          });
          if (photoCells.length > 0) {
            // Group photo cells in rows of 3
            const rows: TableRow[] = [];
            for (let i = 0; i < photoCells.length; i += 3) {
              rows.push(new TableRow({ children: photoCells.slice(i, i + 3) }));
            }
            children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
          }
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text: "[No photos uploaded for this gallery]", color: "94a3b8" })] }));
        }
        break;

      case 'image_comparison':
        // Loops all session upload photos and makes comparative pairs
        const flatPhotos: { base64Data: string; caption?: string }[] = [];
        session.responses.forEach(r => {
          if (r.photos) r.photos.forEach(p => flatPhotos.push(p));
          if (r.checklistAnswers) {
            r.checklistAnswers.forEach(ans => {
              if (ans.photos) ans.photos.forEach(p => flatPhotos.push({ base64Data: p, caption: 'Checklist Photo' }));
            });
          }
        });

        const compareRows: TableRow[] = [];
        for (let i = 0; i < flatPhotos.length; i += 2) {
          const first = flatPhotos[i];
          const second = flatPhotos[i + 1];

          const cellA = new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({ data: getBase64Buffer(first.base64Data)!, transformation: { width: 140, height: 105 } } as any),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: first.caption || 'Before', size: 14 })] })
                ]
              })
            ]
          });

          const cellB = second ? new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({ data: getBase64Buffer(second.base64Data)!, transformation: { width: 140, height: 105 } } as any),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: second.caption || 'After / Alternative', size: 14 })] })
                ]
              })
            ]
          }) : new TableCell({ children: [new Paragraph({ text: "[Alternative photo not captured]" })] });

          compareRows.push(new TableRow({ children: [cellA, cellB] }));
        }

        if (compareRows.length > 0) {
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: compareRows }));
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text: "[No photos found for comparative analysis]", color: "94a3b8" })] }));
        }
        break;

      case 'signature_block':
        const signatureCells: TableCell[] = [];
        
        checklistSchema.components.forEach(checkComp => {
          if (checkComp.type === 'signature') {
            const sigResp = session.responses.find(r => r.componentId === checkComp.id);
            const sigBuf = sigResp?.signatureBase64 ? getBase64Buffer(sigResp.signatureBase64) : null;
            if (sigBuf) {
              signatureCells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new ImageRun({ data: sigBuf, transformation: { width: 140, height: 70 } } as any),
                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: checkComp.title, bold: true })] })
                      ]
                    })
                  ]
                })
              );
            }
          }
        });

        if (signatureCells.length > 0) {
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: signatureCells })] }));
        } else {
          // Empty placeholders
          children.push(
            new Paragraph({ spacing: { before: 400 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "________________________", bold: true })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LEAD INSPECTOR AUTHORIZED SIGN-OFF", size: 16 })] })] }),
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "________________________", bold: true })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CLIENT REPRESENTATIVE ACKNOWLEDGEMENT", size: 16 })] })] })
                  ]
                })
              ]
            })
          );
        }
        break;

      case 'page_break':
        // Mark page break property on last added child
        if (children.length > 0) {
          children[children.length - 1].properties = { pageBreakBefore: true };
        }
        break;

      default:
        break;
    }

    // Handle generic pageBreakAfter config
    if (comp.layout?.pageBreakAfter && children.length > 0 && comp.type !== 'page_break') {
      children[children.length - 1].properties = { pageBreakBefore: true };
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  return Packer.toBuffer(doc);
}
