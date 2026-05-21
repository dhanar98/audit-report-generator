import React from 'react';
import { AuditReport } from '../types/audit';

interface DashboardProps {
  audits: AuditReport[];
  onSelectAudit: (auditId: string) => void;
  onCreateAudit: () => void;
  onDeleteAudit: (auditId: string) => void;
  onCloneAudit: (auditId: string) => void;
  onPreviewAudit: (auditId: string) => void;
}

export default function Dashboard({
  audits,
  onSelectAudit,
  onCreateAudit,
  onDeleteAudit,
  onCloneAudit,
  onPreviewAudit,
}: DashboardProps) {
  // Statistics Calculations
  const totalAudits = audits.length;
  const completedAudits = audits.filter(a => a.status === 'Completed').length;
  const draftAudits = audits.filter(a => a.status === 'Draft').length;

  // Findings breakdown
  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;
  let openFindings = 0;

  audits.forEach(audit => {
    audit.findings.forEach(finding => {
      if (finding.status === 'Open') {
        openFindings++;
        if (finding.riskLevel === 'HIGH') highRisk++;
        if (finding.riskLevel === 'MEDIUM') mediumRisk++;
        if (finding.riskLevel === 'LOW') lowRisk++;
      }
    });
  });

  // Average Compliance Score of Completed Audits (or all if no completed)
  const completedAuditsList = audits.filter(a => a.status === 'Completed');
  const targetAudits = completedAuditsList.length > 0 ? completedAuditsList : audits;
  const averageCompliance = targetAudits.length > 0
    ? Math.round(targetAudits.reduce((acc, curr) => acc + curr.complianceScore, 0) / targetAudits.length)
    : 100;

  // SVG Gauge calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (averageCompliance / 100) * circumference;

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '35px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(to right, #ffffff, var(--text-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '6px'
          }}>
            Audit Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Enterprise compliance auditing, risk assessment, and PDF report compiler.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onCreateAudit}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Audit Report
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* Compliance Gauge Card */}
        <div className="glass-panel" style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', width: '100px', height: '100px' }}>
            {/* SVG Circle Gauge */}
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="url(#complianceGrad)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="complianceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {averageCompliance}%
              </span>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Compliance Health
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
              Average compliance rating across active audits.
            </p>
          </div>
        </div>

        {/* Audit Stats Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Audit Portfolio
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: '700' }}>{totalAudits}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Audits</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-completed)' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>{completedAudits} Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-draft)' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>{draftAudits} Drafts</span>
            </div>
          </div>
        </div>

        {/* Findings Stats Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Open Findings
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: '700', color: openFindings > 0 ? '#f87171' : 'var(--text-primary)' }}>{openFindings}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Unresolved Risks</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
            <span style={{ color: 'var(--risk-high)', padding: '2px 6px', backgroundColor: 'var(--risk-high-bg)', borderRadius: '4px' }}>
              {highRisk} HIGH
            </span>
            <span style={{ color: 'var(--risk-medium)', padding: '2px 6px', backgroundColor: 'var(--risk-medium-bg)', borderRadius: '4px' }}>
              {mediumRisk} MED
            </span>
            <span style={{ color: 'var(--risk-low)', padding: '2px 6px', backgroundColor: 'var(--risk-low-bg)', borderRadius: '4px' }}>
              {lowRisk} LOW
            </span>
          </div>
        </div>
      </div>

      {/* Audits Table Section */}
      <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px' }}>Recent Audit Records</h2>
        
        {audits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: '16px', opacity: 0.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p style={{ fontSize: '0.95rem', marginBottom: '16px' }}>No audit reports found. Create one to get started.</p>
            <button className="btn btn-primary" onClick={onCreateAudit}>Create New Audit</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 10px', fontWeight: '600' }}>Audit Title & Client</th>
                  <th style={{ padding: '14px 10px', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '14px 10px', fontWeight: '600' }}>Auditor</th>
                  <th style={{ padding: '14px 10px', fontWeight: '600', textAlign: 'center' }}>Findings</th>
                  <th style={{ padding: '14px 10px', fontWeight: '600', textAlign: 'center' }}>Compliance</th>
                  <th style={{ padding: '14px 10px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '14px 10px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const totalFindingsCount = audit.findings.length;
                  const openFindingsCount = audit.findings.filter(f => f.status === 'Open').length;
                  
                  return (
                    <tr
                      key={audit.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        fontSize: '0.9rem',
                        verticalAlign: 'middle',
                      }}
                      className="audit-row"
                    >
                      <td style={{ padding: '16px 10px' }}>
                        <div style={{ fontWeight: '600', color: '#ffffff', marginBottom: '3px' }}>{audit.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{audit.company}</div>
                      </td>
                      <td style={{ padding: '16px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {audit.auditDate}
                      </td>
                      <td style={{ padding: '16px 10px', color: 'var(--text-secondary)' }}>
                        {audit.auditorName || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{totalFindingsCount}</span>
                        {openFindingsCount > 0 && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--risk-high)',
                            backgroundColor: 'var(--risk-high-bg)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginLeft: '6px',
                            fontWeight: '600'
                          }}>
                            {openFindingsCount} Open
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: '700',
                          color: audit.complianceScore >= 85 ? 'var(--risk-low)' : audit.complianceScore >= 70 ? 'var(--risk-medium)' : 'var(--risk-high)',
                          fontSize: '0.95rem'
                        }}>
                          {audit.complianceScore}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 10px' }}>
                        <span className={`badge badge-${audit.status.toLowerCase()}`}>
                          {audit.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            title="Edit Audit"
                            onClick={() => onSelectAudit(audit.id)}
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-secondary btn-icon"
                            title="Preview / Print PDF"
                            onClick={() => onPreviewAudit(audit.id)}
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-secondary btn-icon"
                            title="Clone Audit"
                            onClick={() => onCloneAudit(audit.id)}
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            title="Delete Audit"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${audit.title}"?`)) {
                                onDeleteAudit(audit.id);
                              }
                            }}
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
