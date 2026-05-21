import React, { useState, useEffect } from 'react';
import { AuditReport, Finding, RiskLevel, FindingStatus, AuditStatus } from '../types/audit';
import { calculateComplianceScore } from '../utils/mockAudits';
import ReportPreview from './ReportPreview';

interface AuditEditorProps {
  audit: AuditReport;
  onSave: (updatedAudit: AuditReport) => void;
  onCancel: () => void;
}

export default function AuditEditor({ audit, onSave, onCancel }: AuditEditorProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [editedAudit, setEditedAudit] = useState<AuditReport>({ ...audit });
  
  // Local state for adding/editing a single finding
  const [findingFormOpen, setFindingFormOpen] = useState(false);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  
  const [findingTitle, setFindingTitle] = useState('');
  const [findingCategory, setFindingCategory] = useState('');
  const [findingRisk, setFindingRisk] = useState<RiskLevel>('MEDIUM');
  const [findingStatus, setFindingStatus] = useState<FindingStatus>('Open');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingRecommendation, setFindingRecommendation] = useState('');

  // Sync state if audit prop changes
  useEffect(() => {
    setEditedAudit({ ...audit });
  }, [audit]);

  // Handle general audit field changes
  const handleChange = (field: keyof AuditReport, value: any) => {
    setEditedAudit(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  };

  // Stepper navigation
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Open finding form for adding a new finding
  const openNewFindingForm = () => {
    setEditingFindingId(null);
    setFindingTitle('');
    setFindingCategory('');
    setFindingRisk('MEDIUM');
    setFindingStatus('Open');
    setFindingDescription('');
    setFindingRecommendation('');
    setFindingFormOpen(true);
  };

  // Open finding form for editing an existing finding
  const openEditFindingForm = (finding: Finding) => {
    setEditingFindingId(finding.id);
    setFindingTitle(finding.title);
    setFindingCategory(finding.category);
    setFindingRisk(finding.riskLevel);
    setFindingStatus(finding.status);
    setFindingDescription(finding.description);
    setFindingRecommendation(finding.recommendation);
    setFindingFormOpen(true);
  };

  // Save finding (Add or Edit)
  const saveFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingTitle.trim()) return;

    let updatedFindings = [...editedAudit.findings];

    if (editingFindingId) {
      // Edit
      updatedFindings = updatedFindings.map(f => 
        f.id === editingFindingId 
          ? {
              ...f,
              title: findingTitle,
              category: findingCategory,
              riskLevel: findingRisk,
              status: findingStatus,
              description: findingDescription,
              recommendation: findingRecommendation
            }
          : f
      );
    } else {
      // Add new
      const newFinding: Finding = {
        id: `finding-${Date.now()}`,
        title: findingTitle,
        category: findingCategory || 'General Compliance',
        riskLevel: findingRisk,
        status: findingStatus,
        description: findingDescription,
        recommendation: findingRecommendation
      };
      updatedFindings.push(newFinding);
    }

    const updatedScore = calculateComplianceScore(updatedFindings);
    
    setEditedAudit(prev => ({
      ...prev,
      findings: updatedFindings,
      complianceScore: updatedScore
    }));

    setFindingFormOpen(false);
    setEditingFindingId(null);
  };

  // Delete a finding
  const deleteFinding = (findingId: string) => {
    const updatedFindings = editedAudit.findings.filter(f => f.id !== findingId);
    const updatedScore = calculateComplianceScore(updatedFindings);
    
    setEditedAudit(prev => ({
      ...prev,
      findings: updatedFindings,
      complianceScore: updatedScore
    }));
  };

  // Toggle single finding status quickly
  const toggleFindingStatus = (findingId: string) => {
    const updatedFindings = editedAudit.findings.map(f => {
      if (f.id === findingId) {
        return { ...f, status: (f.status === 'Open' ? 'Resolved' : 'Open') as FindingStatus };
      }
      return f;
    });
    
    const updatedScore = calculateComplianceScore(updatedFindings);
    
    setEditedAudit(prev => ({
      ...prev,
      findings: updatedFindings,
      complianceScore: updatedScore
    }));
  };

  // Submit complete audit
  const handleSaveAudit = () => {
    onSave(editedAudit);
  };

  const steps = [
    { num: 1, label: 'Metadata' },
    { num: 2, label: 'Scope & Summary' },
    { num: 3, label: 'Findings Manager' },
    { num: 4, label: 'Review & Compile' }
  ];

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Editor Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Report Studio
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginTop: '4px' }}>
            {editedAudit.id ? 'Edit Audit Report' : 'Create Audit Report'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSaveAudit}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save Report
          </button>
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '700px',
        margin: '0 auto 40px auto',
        position: 'relative'
      }}>
        {/* Connector Line */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          right: '5%',
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          zIndex: 1
        }}>
          {/* Active Connector Progress */}
          <div style={{
            height: '100%',
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            backgroundColor: 'var(--primary)',
            transition: 'width 0.3s ease'
          }}></div>
        </div>

        {/* Steps */}
        {steps.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          
          return (
            <div
              key={step.num}
              onClick={() => setCurrentStep(step.num)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                cursor: 'pointer',
                width: '80px'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: isCompleted ? 'var(--primary)' : isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                border: `2px solid ${isActive || isCompleted ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                color: isCompleted || isActive ? '#ffffff' : 'var(--text-secondary)',
                marginBottom: '8px',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 0 15px var(--primary-glow)' : 'none'
              }}>
                {isCompleted ? (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : step.num}
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Wizard Steps Panels */}
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px', minHeight: '400px' }}>
        
        {/* STEP 1: METADATA */}
        {currentStep === 1 && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </span>
              Audit Metadata Information
            </h2>
            
            <div className="form-group">
              <label className="form-label">Audit Report Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Q2 2026 Cloud Security Compliance Audit"
                value={editedAudit.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Target Organization / Company</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Industries Inc."
                value={editedAudit.company}
                onChange={(e) => handleChange('company', e.target.value)}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Lead Auditor Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jane Doe, CISA"
                  value={editedAudit.auditorName}
                  onChange={(e) => handleChange('auditorName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Audit Completion Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editedAudit.auditDate}
                  onChange={(e) => handleChange('auditDate', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Audit Report Status</label>
              <select
                className="form-select"
                value={editedAudit.status}
                onChange={(e) => handleChange('status', e.target.value as AuditStatus)}
              >
                <option value="Draft">Draft</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 2: SCOPE & SUMMARY */}
        {currentStep === 2 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </span>
              Audit Scope & Summary Narrative
            </h2>
            
            <div className="form-group">
              <label className="form-label">Audit Scope</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Detail the departments, applications, environments, and infrastructure included within the boundaries of this audit."
                value={editedAudit.scope}
                onChange={(e) => handleChange('scope', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Audit Objectives</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="List the primary compliance criteria, standards, regulations, and policies that are being verified."
                value={editedAudit.objectives}
                onChange={(e) => handleChange('objectives', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Executive Summary</label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="Write a high-level summary of the findings, including the general compliance health of the audit target and urgent action recommendations."
                value={editedAudit.executiveSummary}
                onChange={(e) => handleChange('executiveSummary', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3: FINDINGS MANAGER */}
        {currentStep === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'flex', padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </span>
                  Vulnerabilities & Findings ({editedAudit.findings.length})
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Add, edit, or remove findings. Risk weightings directly calculate the overall compliance score: High (-15%), Medium (-8%), Low (-3%).
                </p>
              </div>
              <button className="btn btn-secondary" onClick={openNewFindingForm} style={{ borderColor: 'var(--primary)', color: '#ffffff', backgroundColor: 'rgba(95, 91, 246, 0.1)' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Audit Finding
              </button>
            </div>

            {/* Finding Adding/Editing Inline Form */}
            {findingFormOpen && (
              <form onSubmit={saveFinding} style={{
                backgroundColor: 'rgba(10, 14, 26, 0.6)',
                border: '1px solid var(--primary)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: '0 0 15px rgba(95, 91, 246, 0.15)'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: '#ffffff' }}>
                  {editingFindingId ? 'Edit Finding Detail' : 'Create New Audit Finding'}
                </h3>
                
                <div className="form-group">
                  <label className="form-label">Finding Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SSH Root Login Enabled on Application Web Nodes"
                    value={findingTitle}
                    onChange={(e) => setFindingTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Finding Category</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Infrastructure Security"
                      value={findingCategory}
                      onChange={(e) => setFindingCategory(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Risk Rating</label>
                    <select
                      className="form-select"
                      value={findingRisk}
                      onChange={(e) => setFindingRisk(e.target.value as RiskLevel)}
                    >
                      <option value="HIGH">HIGH (Deduct 15%)</option>
                      <option value="MEDIUM">MEDIUM (Deduct 8%)</option>
                      <option value="LOW">LOW (Deduct 3%)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Finding Status</label>
                    <select
                      className="form-select"
                      value={findingStatus}
                      onChange={(e) => setFindingStatus(e.target.value as FindingStatus)}
                    >
                      <option value="Open">Open (Active Deduction)</option>
                      <option value="Resolved">Resolved (No Deduction)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Technical Description & Evidence</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Detail the configuration issue, security vulnerability, or procedural violation. Note software versions, database configurations, or specific logs."
                    value={findingDescription}
                    onChange={(e) => setFindingDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Remediation Action & Recommendation</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Detail the steps needed to fix this issue, including suggested configurations, patches, or process updates."
                    value={findingRecommendation}
                    onChange={(e) => setFindingRecommendation(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setFindingFormOpen(false)}>
                    Discard
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingFindingId ? 'Apply Changes' : 'Add to Report'}
                  </button>
                </div>
              </form>
            )}

            {/* Findings List */}
            {editedAudit.findings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>No findings added to this audit report yet.</p>
                <button className="btn btn-secondary" onClick={openNewFindingForm} style={{ fontSize: '0.8rem' }}>Add First Finding</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {editedAudit.findings.map((finding) => {
                  const badgeClass = `badge-${finding.riskLevel.toLowerCase()}`;
                  
                  return (
                    <div
                      key={finding.id}
                      className="finding-card"
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative'
                      }}
                    >
                      {/* Top Row: Risk Level, Category, Title & Quick Toggles */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span className={`badge ${badgeClass}`}>{finding.riskLevel}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '500' }}>
                            {finding.category}
                          </span>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>{finding.title}</h4>
                        </div>
                        
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => toggleFindingStatus(finding.id)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              backgroundColor: finding.status === 'Open' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                              borderColor: finding.status === 'Open' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: finding.status === 'Open' ? '#f87171' : '#34d399',
                              fontWeight: '600'
                            }}
                          >
                            {finding.status === 'Open' ? 'Open (Active)' : 'Resolved'}
                          </button>
                          
                          <button
                            className="btn btn-secondary btn-icon"
                            onClick={() => openEditFindingForm(finding)}
                            style={{ padding: '4px', borderRadius: '4px' }}
                            title="Edit Finding"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          
                          <button
                            className="btn btn-danger btn-icon"
                            onClick={() => deleteFinding(finding.id)}
                            style={{ padding: '4px', borderRadius: '4px' }}
                            title="Delete Finding"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Description */}
                      {finding.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '10px' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Description:</span>
                          {finding.description}
                        </div>
                      )}

                      {/* Bottom Row: Recommendation */}
                      {finding.recommendation && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--primary-glow)', paddingLeft: '10px' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', fontSize: '0.8rem', marginBottom: '2px' }}>Remediation Recommendation:</span>
                          {finding.recommendation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & COMPILE */}
        {currentStep === 4 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '30px' }}>
              
              {/* Left Column: Quick Compiler Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Compiler Parameters</h3>
                
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Compliance Score</div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: editedAudit.complianceScore >= 85 ? 'var(--risk-low)' : editedAudit.complianceScore >= 70 ? 'var(--risk-medium)' : 'var(--risk-high)'
                  }}>
                    {editedAudit.complianceScore}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {editedAudit.findings.length} total findings identified
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Status</label>
                  <select
                    className="form-select"
                    value={editedAudit.status}
                    onChange={(e) => handleChange('status', e.target.value as AuditStatus)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={handleSaveAudit}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Compile & Close Studio
                  </button>
                  
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '10px', textAlign: 'center', lineHeight: '1.4' }}>
                    Closing report studio compiles all edits and persists changes to local storage.
                  </p>
                </div>
              </div>

              {/* Right Column: Live Document Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Active Document Preview</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Page matches print/export proportions</span>
                </div>
                
                {/* Embedded Document Preview Box */}
                <div style={{
                  height: '550px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
                }}>
                  <ReportPreview audit={editedAudit} embedMode={true} />
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={prevStep}
          disabled={currentStep === 1}
          style={{ opacity: currentStep === 1 ? 0.3 : 1, cursor: currentStep === 1 ? 'not-allowed' : 'pointer' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Step {currentStep} of {steps.length}
        </span>

        {currentStep < 4 ? (
          <button className="btn btn-primary" onClick={nextStep}>
            Next Step
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSaveAudit}>
            Save & Exit
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
