import React from 'react';
import { AuditReport } from '../types/audit';

interface ReportPreviewProps {
  audit: AuditReport;
  embedMode?: boolean; // If true, hides controls and reduces padding for embedding in panels
  onBack?: () => void;
}

export default function ReportPreview({ audit, embedMode = false, onBack }: ReportPreviewProps) {
  const openPrintDialog = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Findings list helpers
  const highRiskFindings = audit.findings.filter(f => f.riskLevel === 'HIGH');
  const mediumRiskFindings = audit.findings.filter(f => f.riskLevel === 'MEDIUM');
  const lowRiskFindings = audit.findings.filter(f => f.riskLevel === 'LOW');

  return (
    <div style={{
      backgroundColor: embedMode ? '#f3f4f6' : '#0a0e1a',
      minHeight: embedMode ? 'auto' : '100vh',
      color: '#111827', // Crisp dark text for report readability
      fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif', // Elegant, standard editorial typeface
      padding: embedMode ? '20px' : '40px 20px',
    }}>
      {/* Print Controls Banner - Hidden on print */}
      {!embedMode && (
        <div className="no-print" style={{
          maxWidth: '800px',
          margin: '0 auto 30px auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(22, 29, 49, 0.9)',
          border: '1px solid var(--border-color)',
          padding: '16px 24px',
          borderRadius: '12px',
          color: '#ffffff',
          fontFamily: 'var(--font-sans)',
          backdropFilter: 'blur(10px)'
        }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Compliance Rating: <strong style={{ color: '#ffffff' }}>{audit.complianceScore}%</strong>
            </span>
            <button className="btn btn-primary" onClick={openPrintDialog}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.617 0-1.11-.476-1.12-1.09l-.229-2.66m12.218 0H6.12m10.122-3.069a3.75 3.75 0 11-.005-4.437m-10.117 4.437a3.75 3.75 0 10.005-4.437m10.122 0a59.767 59.767 0 010-4.437m-10.122 4.437a59.767 59.767 0 000-4.437m10.122 0l.229-2.523a1.125 1.125 0 00-1.12-1.227H7.23m-1.1 3.75L5.9 3.09A1.125 1.125 0 017.02 2h9.96c.61 0 1.1.48 1.12 1.09l.21 2.66" />
              </svg>
              Print / Save to PDF
            </button>
          </div>
        </div>
      )}

      {/* A4 Page Container */}
      <div className="print-container" style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: embedMode ? '100%' : '800px',
        margin: '0 auto',
        padding: embedMode ? '30px' : '60px 80px',
        borderRadius: embedMode ? '4px' : '4px',
        boxShadow: embedMode ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid #e5e7eb',
        lineHeight: '1.6',
      }}>
        
        {/* ==================== COVER PAGE ==================== */}
        <div style={{
          minHeight: embedMode ? 'auto' : '850px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderBottom: embedMode ? '2px solid #e5e7eb' : 'none',
          paddingBottom: embedMode ? '40px' : '0',
          marginBottom: embedMode ? '40px' : '0'
        }}>
          {/* Header Graphic Accent */}
          <div style={{
            height: '8px',
            background: 'linear-gradient(to right, #4f46e5, #06b6d4, #10b981)',
            margin: '0 -80px',
            marginTop: '-60px'
          }} className="no-print-margin"></div>

          {/* Title Area */}
          <div style={{ marginTop: '120px' }}>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#4f46e5',
              fontFamily: 'sans-serif',
              display: 'block',
              marginBottom: '16px'
            }}>
              Official Compliance Document
            </span>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              lineHeight: '1.2',
              color: '#0f172a',
              marginBottom: '20px',
              fontFamily: 'sans-serif'
            }}>
              {audit.title || 'Untitled Audit Report'}
            </h1>
            <div style={{
              height: '3px',
              backgroundColor: '#e2e8f0',
              width: '100px',
              marginBottom: '20px'
            }}></div>
            <p style={{
              fontSize: '1.15rem',
              color: '#4b5563',
              maxWidth: '550px'
            }}>
              Comprehensive controls testing, risk register review, and governance evaluation for <strong>{audit.company || 'Internal Organization'}</strong>.
            </p>
          </div>

          {/* Metadata & Stats Area */}
          <div style={{
            marginBottom: '80px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '24px',
            fontFamily: 'sans-serif',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Target Organization</div>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>{audit.company || 'Not Specified'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Audit Conducted By</div>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>{audit.auditorName || 'Lead Auditor'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Release Date</div>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>{audit.auditDate || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Security Rating</div>
                <div style={{ fontWeight: '700', fontSize: '1.1rem', color: audit.complianceScore >= 85 ? '#059669' : audit.complianceScore >= 70 ? '#d97706' : '#dc2626' }}>
                  {audit.complianceScore}% ({audit.complianceScore >= 85 ? 'Adequate' : audit.complianceScore >= 70 ? 'Action Needed' : 'Deficient'})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SECTION 1: EXEC SUMMARY ==================== */}
        <div className="page-break" style={{ paddingTop: embedMode ? '0' : '40px', marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#0f172a',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '8px',
            marginBottom: '20px',
            fontFamily: 'sans-serif'
          }}>
            1. Executive Summary & Assessment
          </h2>
          
          <p style={{
            fontSize: '1rem',
            color: '#334155',
            marginBottom: '20px',
            textAlign: 'justify',
            textIndent: '20px'
          }}>
            {audit.executiveSummary || 'No executive summary provided. This audit was initialized for the purpose of validating internal business compliance parameters, system configurations, and risk registers.'}
          </p>

          <div style={{
            backgroundColor: '#f8fafc',
            borderLeft: '4px solid #4f46e5',
            padding: '16px 20px',
            margin: '25px 0',
            borderRadius: '0 4px 4px 0',
            fontSize: '0.9rem',
            color: '#475569',
            fontFamily: 'sans-serif'
          }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '6px' }}>Regulatory Compliance Notice</strong>
            This evaluation has been conducted in accordance with institutional internal control evaluation frameworks. The results represented inside reflect the configuration state as of the official audit date of record.
          </div>
        </div>

        {/* ==================== SECTION 2: SCOPE & OBJECTIVES ==================== */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#0f172a',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '8px',
            marginBottom: '20px',
            fontFamily: 'sans-serif'
          }}>
            2. Scope & Methodology
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#334155', marginBottom: '8px', fontFamily: 'sans-serif' }}>2.1 Audit Scope Boundaries</h3>
            <p style={{ fontSize: '0.95rem', color: '#475569', textAlign: 'justify' }}>
              {audit.scope || 'General operations, infrastructure components, databases, and configuration settings.'}
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#334155', marginBottom: '8px', fontFamily: 'sans-serif' }}>2.2 Targeted Control Objectives</h3>
            <p style={{ fontSize: '0.95rem', color: '#475569', textAlign: 'justify' }}>
              {audit.objectives || 'To evaluate baseline technical controls, examine compliance parameters, identify security vulnerabilities, and log findings requiring immediate remedy.'}
            </p>
          </div>
        </div>

        {/* ==================== SECTION 3: FINDINGS REGISTER ==================== */}
        <div className="page-break" style={{ paddingTop: embedMode ? '0' : '40px', marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#0f172a',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '8px',
            marginBottom: '20px',
            fontFamily: 'sans-serif'
          }}>
            3. Control Deficiencies & Findings Register
          </h2>

          <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '20px' }}>
            The following table lists the deficiencies identified during control tests. Statuses are designated as <strong>Open</strong> (unremedied vulnerability) or <strong>Resolved</strong> (satisfactorily patched control).
          </p>

          {audit.findings.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#059669',
              backgroundColor: '#ecfdf5',
              fontFamily: 'sans-serif',
              fontWeight: '600'
            }}>
              No control deficiencies or findings identified. Clean compliance sheet.
            </div>
          ) : (
            <>
              {/* Findings Summary Table */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                fontFamily: 'sans-serif',
                marginBottom: '40px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #94a3b8', backgroundColor: '#f1f5f9', color: '#1e293b' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>ID</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Finding Area / Title</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: '700' }}>Severity</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: '700' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.findings.map((finding, idx) => (
                    <tr key={finding.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: '600' }}>F-{idx + 1}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{finding.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{finding.category}</div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: '700',
                          color: finding.riskLevel === 'HIGH' ? '#dc2626' : finding.riskLevel === 'MEDIUM' ? '#d97706' : '#059669',
                          textTransform: 'uppercase'
                        }}>
                          {finding.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: finding.status === 'Open' ? '#b91c1c' : '#047857' }}>
                        {finding.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Detailed Findings Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', fontFamily: 'sans-serif', marginBottom: '-10px' }}>
                  Deficiency Details & Recommendations
                </h3>
                
                {audit.findings.map((finding, idx) => (
                  <div
                    key={finding.id}
                    className="finding-card"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '20px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '8px',
                      marginBottom: '12px',
                      fontFamily: 'sans-serif'
                    }}>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        Finding F-{idx + 1}: {finding.title}
                      </span>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: finding.riskLevel === 'HIGH' ? '#dc2626' : finding.riskLevel === 'MEDIUM' ? '#d97706' : '#059669'
                      }}>
                        {finding.riskLevel} RISK
                      </span>
                    </div>

                    <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', color: '#334155', fontFamily: 'sans-serif', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Technical Evidence & Observation:
                      </strong>
                      <p style={{ color: '#4b5563', textAlign: 'justify' }}>{finding.description || 'No description logged.'}</p>
                    </div>

                    <div style={{ fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', color: '#334155', fontFamily: 'sans-serif', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Remediation Action Plan:
                      </strong>
                      <p style={{ color: '#4b5563', textAlign: 'justify' }}>{finding.recommendation || 'No recommendation logged.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ==================== SIGNATURE SIGN-OFF ==================== */}
        <div className="page-break" style={{ paddingTop: embedMode ? '0' : '60px', marginTop: '60px' }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#0f172a',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '8px',
            marginBottom: '60px',
            fontFamily: 'sans-serif'
          }}>
            4. Audit Sign-off & Authorizations
          </h2>

          <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '50px' }}>
            By signing below, the authorized lead auditor and client representatives acknowledge findings, recommended remediation schedules, and overall audit scope definitions recorded inside this report.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '40px',
            fontFamily: 'sans-serif',
            fontSize: '0.85rem'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: '1px', backgroundColor: '#94a3b8', marginBottom: '8px' }}></div>
              <strong style={{ color: '#1e293b', display: 'block' }}>Lead Auditor Signature</strong>
              <span style={{ color: '#64748b' }}>{audit.auditorName || 'Sarah Jenkins, Lead CISA'}</span>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Date: ________________________</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ height: '1px', backgroundColor: '#94a3b8', marginBottom: '8px' }}></div>
              <strong style={{ color: '#1e293b', display: 'block' }}>Client Sign-off Representative</strong>
              <span style={{ color: '#64748b' }}>Representative for {audit.company || 'Apex Global Technologies'}</span>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Date: ________________________</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
