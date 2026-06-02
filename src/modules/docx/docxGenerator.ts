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
  BorderStyle, 
  WidthType,
  VerticalAlign
} from 'docx';
import { DynamicChecklistSchema, DynamicAuditSession, DynamicComponentResponse } from '@/types/dynamicSchema';

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

export async function generateDocx(schema: DynamicChecklistSchema, session: DynamicAuditSession): Promise<Buffer> {
  const children: any[] = [];

  // Calculate score
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
      if (resp?.yesNoNa === 'NO') score -= 10;
    }
  });
  score = Math.max(0, score);

  // 1. Cover Page Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1000, after: 300 },
      children: [
        new TextRun({
          text: schema.title,
          bold: true,
          size: 44, // 22pt
          color: "1e3a8a",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
      children: [
        new TextRun({
          text: "AUDIT ASSURANCE COMPLIANCE REPORT",
          bold: true,
          size: 24, // 12pt
          color: "64748b",
        }),
      ],
    })
  );

  // 2. Score Badge
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: `Score: ${score}%`,
          bold: true,
          size: 36, // 18pt
          color: score >= 80 ? "16a34a" : score >= 50 ? "d97706" : "dc2626",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
      children: [
        new TextRun({
          text: "COMPLIANCE LEVEL RATING",
          size: 18,
          color: "94a3b8",
        }),
      ],
    })
  );

  // 3. Metadata Table
  const dateString = session.completedAt 
    ? new Date(session.completedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
    : new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

  children.push(
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Site Address", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ text: session.siteAddress || 'N/A' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Lead Auditor", bold: true })] })] }),
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
    }),
    new Paragraph({ spacing: { after: 1000 }, children: [new TextRun({ text: "" })] }) // spacing / page break
  );

  // Page Break between cover and body
  children[children.length - 1].properties = { pageBreakBefore: true };

  // 4. Loop over components
  schema.components.forEach(comp => {
    const resp = session.responses.find(r => r.componentId === comp.id);

    if (comp.type === 'header') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 100 },
          children: [
            new TextRun({
              text: comp.title,
              bold: true,
              color: "0f172a",
            })
          ]
        })
      );
      if (comp.subtitle) {
        children.push(new Paragraph({ children: [new TextRun({ text: comp.subtitle, italics: true, color: "475569" })] }));
      }
      if (comp.description) {
        children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: comp.description, color: "64748b" })] }));
      }

      // Render child fields if any (e.g. for converted V1 header fields)
      const headerFields = (comp as any).fields;
      if (headerFields && headerFields.length > 0) {
        const tableRows = headerFields.map((f: any) => {
          const fResp = session.responses.find(r => r.componentId === f.id);
          const fValue = fResp?.value || '';
          return new TableRow({
            children: [
              new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: f.title, bold: true })] })] }),
              new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: fValue })] })
            ]
          });
        });
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }), new Paragraph({ spacing: { after: 200 } }));
      }
    }

    else if (comp.type === 'rich_content') {
      const plainText = comp.content.replace(/<[^>]*>/g, ''); // strip HTML
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: plainText, color: "334155" })]
        })
      );
    }

    else if (comp.type === 'checklist') {
      // Checklist table header
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Compliance Checkpoint / Question", bold: true })] })] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Risk Level", bold: true })] })] })
          ]
        })
      ];

      comp.items.forEach(item => {
        const ans = resp?.checklistAnswers?.find(a => a.itemId === item.id);
        const statusVal = ans?.value || 'UNANSWERED';
        
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: item.question })] }),
              new TableCell({ 
                children: [
                  new Paragraph({ 
                    children: [
                      new TextRun({ 
                        text: statusVal, 
                        bold: true, 
                        color: statusVal === 'YES' ? "10b981" : statusVal === 'NO' ? "ef4444" : "64748b" 
                      })
                    ] 
                  })
                ] 
              }),
              new TableCell({ children: [new Paragraph({ text: item.riskLevel })] })
            ]
          })
        );
      });

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }), new Paragraph({ spacing: { after: 200 } }));

      // Checklist remediation findings
      comp.items.forEach(item => {
        const ans = resp?.checklistAnswers?.find(a => a.itemId === item.id);
        if (ans?.value === 'NO') {
          children.push(
            new Paragraph({
              spacing: { before: 200 },
              children: [
                new TextRun({ text: `Non-Compliance Finding: ${item.question}`, bold: true, color: "991b1b" })
              ]
            })
          );
          if (ans.remarks) {
            children.push(new Paragraph({ children: [new TextRun({ text: `Observation: `, bold: true }), new TextRun({ text: ans.remarks })] }));
          }
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Recommendation: `, bold: true }),
                new TextRun({ text: ans.recommendation || 'Remediate immediately.', color: "7f1d1d" })
              ]
            })
          );

          // Photos for findings
          if (ans.photos && ans.photos.length > 0) {
            const photoCells: TableCell[] = [];
            ans.photos.forEach(b64 => {
              const buf = getBase64Buffer(b64);
              if (buf) {
                photoCells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            data: buf,
                            transformation: { width: 140, height: 105 }
                          } as any),
                          new Paragraph({ children: [new TextRun({ text: "Evidence Attachment", size: 14, color: "64748b" })] })
                        ]
                      })
                    ]
                  })
                );
              }
            });

            if (photoCells.length > 0) {
              children.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [new TableRow({ children: photoCells })]
                }),
                new Paragraph({ spacing: { after: 150 } })
              );
            }
          }
        }
      });
    }

    else if (comp.type === 'yes_no_na') {
      const statusVal = resp?.yesNoNa || 'UNANSWERED';
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({ text: `${comp.title}: `, bold: true }),
            new TextRun({ 
              text: statusVal, 
              bold: true, 
              color: statusVal === 'YES' ? "10b981" : statusVal === 'NO' ? "ef4444" : "64748b" 
            })
          ]
        })
      );
      if (statusVal === 'NO' && resp?.observationAnswer?.recommendation) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Recommendation: ", bold: true }),
              new TextRun({ text: resp.observationAnswer.recommendation, color: "7f1d1d" })
            ]
          })
        );
      }
    }

    else if (comp.type === 'observation') {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: comp.title, bold: true })]
        }),
        new Paragraph({
          children: [new TextRun({ text: `Question: ${comp.question}`, italics: true, color: "475569" })]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Answer: `, bold: true }),
            new TextRun({ text: resp?.observationAnswer?.answer || 'No observation entered.' })
          ]
        })
      );

      if (resp?.photos && resp.photos.length > 0) {
        const obsPhotos: TableCell[] = [];
        resp.photos.forEach(p => {
          const buf = getBase64Buffer(p.base64Data);
          if (buf) {
            obsPhotos.push(
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({ data: buf, transformation: { width: 140, height: 105 } } as any),
                      new Paragraph({ children: [new TextRun({ text: p.caption || "Observation Photo", size: 14, color: "64748b" })] })
                    ]
                  })
                ]
              })
            );
          }
        });

        if (obsPhotos.length > 0) {
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [new TableRow({ children: obsPhotos })]
            })
          );
        }
      }
    }

    else if (comp.type === 'table_grid') {
      const gridRowsMap: Record<string, Record<string, string>> = {};
      resp?.tableRows?.forEach(cell => {
        if (!gridRowsMap[cell.rowId]) gridRowsMap[cell.rowId] = {};
        gridRowsMap[cell.rowId][cell.colId] = cell.value;
      });

      const rowIds = Object.keys(gridRowsMap);
      const docxGridRows = [
        new TableRow({
          children: comp.columns.map(col => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col.header, bold: true })] })] }))
        })
      ];

      rowIds.forEach(rowId => {
        docxGridRows.push(
          new TableRow({
            children: comp.columns.map(col => {
              const val = gridRowsMap[rowId][col.id] || '';
              return new TableCell({ children: [new Paragraph({ text: val })] });
            })
          })
        );
      });

      // calculations footer row
      const hasCalcs = comp.columns.some(col => col.calculation && col.calculation !== 'NONE');
      if (hasCalcs) {
        docxGridRows.push(
          new TableRow({
            children: comp.columns.map(col => {
              if (!col.calculation || col.calculation === 'NONE') {
                return new TableCell({ children: [new Paragraph({ text: "" })] });
              }
              const numericVals = rowIds
                .map(rId => parseFloat(gridRowsMap[rId][col.id]))
                .filter(v => !isNaN(v));

              let footText = '-';
              if (numericVals.length > 0) {
                if (col.calculation === 'SUM') {
                  footText = `Sum: ${numericVals.reduce((a, b) => a + b, 0).toFixed(1)}`;
                } else if (col.calculation === 'AVG') {
                  const sum = numericVals.reduce((a, b) => a + b, 0);
                  footText = `Avg: ${(sum / numericVals.length).toFixed(1)}`;
                } else if (col.calculation === 'PRODUCT') {
                  footText = `Prod: ${numericVals.reduce((a, b) => a * b, 1).toFixed(1)}`;
                }
              }
              return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: footText, bold: true })] })] });
            })
          })
        );
      }

      children.push(
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: comp.title, bold: true })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: docxGridRows
        })
      );
    }

    else if (comp.type === 'signature') {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: comp.title, bold: true })]
        })
      );

      const sigBuf = resp?.signatureBase64 ? getBase64Buffer(resp.signatureBase64) : null;
      if (sigBuf) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: sigBuf,
                transformation: { width: 150, height: 75 }
              } as any)
            ]
          })
        );
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: "[No signature provided]", color: "94a3b8" })] }));
      }
    }
  });

  // 5. Final Signature table placeholder
  children.push(
    new Paragraph({ spacing: { before: 1000 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "___________________________", bold: true })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "LEAD INSPECTOR AUTHORIZED SIGNATURE", size: 16 })]
                })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "___________________________", bold: true })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "CLIENT REPRESENTATIVE ACKNOWLEDGEMENT", size: 16 })]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  // Compile document
  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
