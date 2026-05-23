import React, { useState, useEffect } from 'react';
import { 
  DynamicChecklistSchema, 
  DynamicComponentResponse, 
  DynamicAuditSession,
  ChecklistItem,
  TableColumn,
  DynamicCellResponse
} from '@/types/dynamicSchema';
import { LOOKUP_CLIENTS } from '@/lib/lookupData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, CheckCircle, ArrowLeft, Layers, ShieldAlert, Award } from 'lucide-react';
import { DynamicDropdowns } from './DynamicDropdowns';
import { SignaturePad } from './SignaturePad';
import { TableGrid } from './TableGrid';
import { ImageUpload } from './ImageUpload';
import { ImageCarousel } from './ImageCarousel';
import { ChecklistCard } from './ChecklistCard';
import { KpiSummaryCard } from './KpiSummaryCard';

interface DynamicRendererProps {
  schema: DynamicChecklistSchema;
  initialSession?: DynamicAuditSession | null;
  onSave: (session: DynamicAuditSession) => void;
  onComplete: (session: DynamicAuditSession) => void;
  onBack: () => void;
  onExportPdf?: (session: DynamicAuditSession) => void;
  onExportDocx?: (session: DynamicAuditSession) => void;
  readOnly?: boolean;
}

export function DynamicRenderer({
  schema,
  initialSession,
  onSave,
  onComplete,
  onBack,
  onExportPdf,
  onExportDocx,
  readOnly = false
}: DynamicRendererProps) {
  // Initialize state
  const [session, setSession] = useState<DynamicAuditSession>(() => {
    if (initialSession) return initialSession;
    return {
      id: `session_${Math.random().toString(36).substr(2, 9)}`,
      schemaId: schema.id,
      clientName: '',
      siteName: '',
      siteAddress: '',
      auditorName: '',
      status: 'In_Progress',
      startedAt: new Date().toISOString(),
      responses: []
    };
  });

  const [activeTab, setActiveTab] = useState<string>('form'); // 'form' | 'kpis' | 'photos'

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
    }
  }, [initialSession]);

  // Helpers to manage component responses
  const getResponse = (componentId: string): DynamicComponentResponse => {
    return session.responses.find(r => r.componentId === componentId) || { componentId };
  };

  const updateResponse = (componentId: string, updates: Partial<DynamicComponentResponse>) => {
    setSession(prev => {
      const idx = prev.responses.findIndex(r => r.componentId === componentId);
      const responsesCopy = [...prev.responses];

      if (idx > -1) {
        responsesCopy[idx] = { ...responsesCopy[idx], ...updates };
      } else {
        responsesCopy.push({ componentId, ...updates });
      }

      return { ...prev, responses: responsesCopy };
    });
  };

  // 1. KPI Summarizer Metrics
  const calculateKpiStats = () => {
    let totalChecked = 0;
    let yesCount = 0;
    let noCount = 0;
    let naCount = 0;
    const riskLevels = { high: 0, med: 0, low: 0 };

    (schema?.components || []).forEach(comp => {
      if (comp.type === 'checklist') {
        const resp = getResponse(comp.id);
        comp.items.forEach(item => {
          const ans = resp.checklistAnswers?.find(a => a.itemId === item.id);
          if (ans?.value === 'YES') {
            yesCount++;
            totalChecked++;
          } else if (ans?.value === 'NO') {
            noCount++;
            totalChecked++;
            if (item.riskLevel === 'HIGH') riskLevels.high++;
            else if (item.riskLevel === 'MEDIUM') riskLevels.med++;
            else if (item.riskLevel === 'LOW') riskLevels.low++;
          } else if (ans?.value === 'N/A') {
            naCount++;
          }
        });
      } else if (comp.type === 'yes_no_na') {
        const resp = getResponse(comp.id);
        if (resp.yesNoNa === 'YES') {
          yesCount++;
          totalChecked++;
        } else if (resp.yesNoNa === 'NO') {
          noCount++;
          totalChecked++;
          riskLevels.high++; // default yes_no_na failures to high risk
        } else if (resp.yesNoNa === 'N/A') {
          naCount++;
        }
      }
    });

    return { totalChecked, yesCount, noCount, naCount, riskLevels };
  };

  const kpis = calculateKpiStats();

  // 2. Fetch all photos in the session for Global Carousel
  const getAllPhotos = () => {
    const list: any[] = [];
    session.responses.forEach(resp => {
      if (resp.photos) list.push(...resp.photos);
      if (resp.checklistAnswers) {
        resp.checklistAnswers.forEach(ans => {
          if (ans.photos) {
            ans.photos.forEach(b64 => {
              list.push({
                id: `sub_${Math.random()}`,
                fileName: 'attached_evidence.webp',
                mimeType: 'image/webp',
                base64Data: b64,
                caption: 'Checklist Remediation Attachment'
              });
            });
          }
        });
      }
    });
    return list;
  };

  const sessionPhotos = getAllPhotos();

  // Validate form submission
  const handleFinalize = () => {
    // Basic fields validation
    if (!session.clientName || !session.siteName || !session.auditorName) {
      alert('Please fill out the client, site, and auditor information in the header/dropdown fields.');
      return;
    }

    // Schema required components validation
    let validationFailed = false;
    (schema?.components || []).forEach(comp => {
      if (comp.required) {
        const resp = getResponse(comp.id);
        if (comp.type === 'signature' && !resp.signatureBase64) {
          validationFailed = true;
        } else if (comp.type === 'observation' && !resp.observationAnswer?.answer) {
          validationFailed = true;
        } else if (comp.type === 'yes_no_na' && !resp.yesNoNa) {
          validationFailed = true;
        }
      }
    });

    if (validationFailed) {
      alert('Required sections are missing entries. Please inspect all questions.');
      return;
    }

    onComplete({
      ...session,
      status: 'Completed',
      completedAt: new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden relative bg-background">
      
      {/* Dynamic Form Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card/65 border-b border-border/80 z-10 backdrop-blur-md gap-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="xs" onClick={onBack} className="h-7 w-7 p-0 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-bold text-primary truncate max-w-[200px] sm:max-w-md">{schema.title}</h3>
          </div>
          <span className="text-[10px] text-muted-foreground pl-9">
            Status: <span className="font-semibold text-amber-500">{session.status}</span>
          </span>
        </div>

        {/* View Tabs Selector */}
        <div className="flex bg-muted/40 border border-border/60 p-0.5 rounded-lg text-xs">
          <button 
            type="button" 
            onClick={() => setActiveTab('form')} 
            className={`px-3 py-1 rounded-md transition-all font-semibold ${activeTab === 'form' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Audit Form
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('kpis')} 
            className={`px-3 py-1 rounded-md transition-all font-semibold ${activeTab === 'kpis' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            KPI Snapshot
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('photos')} 
            className={`px-3 py-1 rounded-md transition-all font-semibold ${activeTab === 'photos' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Evidence ({sessionPhotos.length})
          </button>
        </div>
        
        {/* Toolbar Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" onClick={() => onSave(session)} className="h-8 text-xs">
                <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
              </Button>
              <Button size="sm" onClick={handleFinalize} className="h-8 text-xs bg-primary hover:bg-primary/95 text-primary-foreground">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Finalize Report
              </Button>
            </>
          )}
          {onExportPdf && (
            <Button size="sm" variant="outline" onClick={() => onExportPdf(session)} className="h-8 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10">
              Export PDF
            </Button>
          )}
          {onExportDocx && (
            <Button size="sm" variant="outline" onClick={() => onExportDocx(session)} className="h-8 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
              Export Word
            </Button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
        <div className="max-w-4xl mx-auto w-full space-y-6">

          {/* TAB 1: FORM EDITOR */}
          {activeTab === 'form' && (
            <div className="space-y-6">
              {(schema?.components || []).map((comp) => {
                const resp = getResponse(comp.id);

                switch (comp.type) {
                  case 'header':
                    return (
                      <div key={comp.id} className="text-left border-b border-border/80 pb-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-lg font-black text-foreground">{comp.title}</h1>
                          {comp.category && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold uppercase border border-primary/20">
                              {comp.category}
                            </span>
                          )}
                          {comp.riskLevel && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold uppercase border border-red-500/20">
                              Risk: {comp.riskLevel}
                            </span>
                          )}
                        </div>
                        {comp.subtitle && <h2 className="text-xs text-muted-foreground font-semibold">{comp.subtitle}</h2>}
                        {comp.description && <p className="text-xs text-muted-foreground/90">{comp.description}</p>}
                      </div>
                    );

                  case 'rich_content':
                    return (
                      <div key={comp.id} className="text-left bg-muted/15 border border-border/60 p-4 rounded-xl text-xs text-foreground/80 leading-relaxed font-normal"
                        dangerouslySetInnerHTML={{ __html: comp.content }}
                      />
                    );

                  case 'dynamic_dropdown':
                    return (
                      <div key={comp.id} className="p-4 rounded-xl border border-border/80 bg-card/10 space-y-4">
                        <h4 className="text-xs font-bold text-foreground text-left uppercase tracking-wider">{comp.title}</h4>
                        <DynamicDropdowns
                          clientId={session.clientName ? LOOKUP_CLIENTS.find(c => c.name === session.clientName)?.id : ''}
                          siteId={session.siteName ? LOOKUP_CLIENTS.find(c => c.name === session.clientName)?.sites.find(s => s.name === session.siteName)?.id : ''}
                          auditorId={session.auditorName ? LOOKUP_CLIENTS.find(c => c.name === session.clientName)?.sites.find(s => s.name === session.siteName)?.auditors.find(a => a.name === session.auditorName)?.id : ''}
                          address={session.siteAddress}
                          readOnly={readOnly}
                          onChange={(updates) => {
                            setSession(prev => ({
                              ...prev,
                              clientName: updates.clientName !== undefined ? updates.clientName : prev.clientName,
                              siteName: updates.siteName !== undefined ? updates.siteName : prev.siteName,
                              siteAddress: updates.address !== undefined ? updates.address : prev.siteAddress,
                              auditorName: updates.auditorName !== undefined ? updates.auditorName : prev.auditorName
                            }));
                          }}
                        />
                      </div>
                    );

                  case 'checklist':
                    return (
                      <div key={comp.id} className="space-y-4">
                        <div className="text-left border-l-4 border-primary pl-3 py-1">
                          <h3 className="text-sm font-bold text-foreground">{comp.title}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {comp.items.map((item) => {
                            const ans = resp.checklistAnswers?.find(a => a.itemId === item.id) || { itemId: item.id, value: '' };
                            return (
                              <ChecklistCard
                                key={item.id}
                                item={item}
                                value={ans.value}
                                remarks={ans.remarks}
                                recommendation={ans.recommendation}
                                resolvedDays={ans.resolvedDays}
                                photos={ans.photos?.map((b64, idx) => ({
                                  id: `${item.id}_img_${idx}`,
                                  fileName: 'capture.webp',
                                  mimeType: 'image/webp',
                                  base64Data: b64
                                }))}
                                readOnly={readOnly}
                                onResponseChange={(updates) => {
                                  const currentAnswers = resp.checklistAnswers ? [...resp.checklistAnswers] : [];
                                  const idx = currentAnswers.findIndex(a => a.itemId === item.id);
                                  
                                  const ansPayload = {
                                    itemId: item.id,
                                    value: updates.value,
                                    remarks: updates.remarks,
                                    recommendation: updates.recommendation,
                                    resolvedDays: updates.resolvedDays,
                                    photos: updates.photos?.map(p => p.base64Data) || []
                                  };

                                  if (idx > -1) {
                                    currentAnswers[idx] = ansPayload;
                                  } else {
                                    currentAnswers.push(ansPayload);
                                  }

                                  updateResponse(comp.id, { checklistAnswers: currentAnswers });
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );

                  case 'yes_no_na':
                    return (
                      <div key={comp.id} className="p-4 rounded-xl border border-border/80 bg-card/20 text-left space-y-3">
                        <label className="text-xs font-semibold text-foreground flex items-center">
                          {comp.title} {comp.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <div className="flex space-x-2">
                          {(['YES', 'NO', 'N/A'] as const).map((opt) => {
                            const isSelected = resp.yesNoNa === opt;
                            const btnLabels = comp.labels || { yes: 'YES', no: 'NO', na: 'N/A' };
                            const labelText = opt === 'YES' ? btnLabels.yes : opt === 'NO' ? btnLabels.no : btnLabels.na;

                            return (
                              <Button
                                key={opt}
                                type="button"
                                disabled={readOnly}
                                size="xs"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => {
                                  const recommendation = opt === 'NO' ? (comp.recoMapping?.no || 'Remediation required.') : '';
                                  updateResponse(comp.id, { 
                                    yesNoNa: opt,
                                    value: opt,
                                    observationAnswer: {
                                      answer: labelText,
                                      recommendation
                                    }
                                  });
                                }}
                                className={`h-8 px-4 text-xs font-semibold ${
                                  isSelected && opt === 'YES' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                  isSelected && opt === 'NO' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                  isSelected && opt === 'N/A' ? 'bg-zinc-500 hover:bg-zinc-600 text-white' : ''
                                }`}
                              >
                                {labelText}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    );

                  case 'observation':
                    return (
                      <div key={comp.id} className="p-4 rounded-xl border border-border/80 bg-card/25 text-left space-y-3">
                        <label className="text-xs font-semibold text-foreground flex items-center">
                          {comp.title} {comp.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <span className="text-[10px] text-muted-foreground block leading-relaxed">{comp.question}</span>
                        <Textarea
                          value={resp.observationAnswer?.answer || ''}
                          disabled={readOnly}
                          onChange={(e) => {
                            const prevObs = resp.observationAnswer || { answer: '' };
                            updateResponse(comp.id, {
                              observationAnswer: { ...prevObs, answer: e.target.value }
                            });
                          }}
                          placeholder={comp.placeholder || "Enter detailed observation notes here..."}
                          className="text-xs bg-card border-border/80"
                        />
                        {comp.allowImage && (
                          <ImageUpload
                            componentId={comp.id}
                            images={resp.photos || []}
                            disabled={readOnly}
                            onChange={(updatedPhotos) => updateResponse(comp.id, { photos: updatedPhotos })}
                            maxImages={3}
                            label="Capture Field Photos"
                          />
                        )}
                      </div>
                    );

                  case 'table_grid':
                    return (
                      <div key={comp.id} className="space-y-3">
                        <div className="text-left border-l-4 border-primary pl-3 py-0.5">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{comp.title}</h4>
                        </div>
                        <TableGrid
                          componentId={comp.id}
                          columns={comp.columns}
                          cells={resp.tableRows || []}
                          defaultRowCount={comp.defaultRowCount}
                          readOnly={readOnly}
                          onChange={(updatedCells) => updateResponse(comp.id, { tableRows: updatedCells })}
                        />
                      </div>
                    );

                  case 'signature':
                    return (
                      <div key={comp.id} className="p-4 rounded-xl border border-border/80 bg-card/20 text-left space-y-3">
                        <label className="text-xs font-semibold text-foreground flex items-center">
                          {comp.title} {comp.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <SignaturePad
                          value={resp.signatureBase64}
                          readOnly={readOnly}
                          onChange={(base64) => updateResponse(comp.id, { signatureBase64: base64 })}
                        />
                      </div>
                    );

                  case 'image_upload':
                    return (
                      <div key={comp.id} className="p-4 rounded-xl border border-border/80 bg-card/20 text-left">
                        <ImageUpload
                          componentId={comp.id}
                          images={resp.photos || []}
                          disabled={readOnly}
                          maxImages={comp.maxImages || 3}
                          onChange={(updatedPhotos) => updateResponse(comp.id, { photos: updatedPhotos })}
                          label={comp.title}
                        />
                      </div>
                    );

                  case 'image_carousel': {
                    // Links images from target component or shows images in this carousel
                    const targetResp = comp.targetComponentId ? getResponse(comp.targetComponentId) : resp;
                    const carouselImages = targetResp.photos || [];
                    return (
                      <div key={comp.id} className="space-y-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold text-left block">{comp.title}</span>
                        <ImageCarousel
                          images={carouselImages}
                          readOnly={true}
                        />
                      </div>
                    );
                  }

                  default:
                    return null;
                }
              })}
            </div>
          )}

          {/* TAB 2: KPI SNAPSHOT */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-black text-foreground">Audit Performance Dashboard</h2>
                <p className="text-xs text-muted-foreground">Detailed metrics computed in real-time based on active answers.</p>
              </div>

              <KpiSummaryCard
                totalChecked={kpis.totalChecked}
                yesCount={kpis.yesCount}
                noCount={kpis.noCount}
                naCount={kpis.naCount}
                riskLevels={kpis.riskLevels}
              />

              {/* Remediation Action Items list */}
              {kpis.noCount > 0 && (
                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-left space-y-4">
                  <div className="flex items-center space-x-2 text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Required Compliance Remediation Action Items</h4>
                  </div>
                  <div className="divide-y divide-red-500/10">
                    {(schema?.components || []).map(comp => {
                      if (comp.type !== 'checklist') return null;
                      const resp = getResponse(comp.id);
                      return comp.items.map(item => {
                        const ans = resp.checklistAnswers?.find(a => a.itemId === item.id);
                        if (ans?.value !== 'NO') return null;

                        return (
                          <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-foreground">{item.question}</span>
                              <p className="text-[10px] text-muted-foreground"><strong>Recommendation:</strong> {ans.recommendation || 'No recommendation specified'}</p>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0 self-start sm:self-center">
                              Resolve in {ans.resolvedDays || item.targetResolveDays || 7} Days
                            </span>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVIDENCE CAROUSEL */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-black text-foreground">Global Image Evidence Gallery</h2>
                <p className="text-xs text-muted-foreground">Browse all audit photo records captured across checklists and fields.</p>
              </div>

              {sessionPhotos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <ImageCarousel images={sessionPhotos} readOnly={true} />
                  </div>
                  {sessionPhotos.map((photo) => (
                    <div key={photo.id} className="border border-border/80 rounded-xl overflow-hidden bg-card p-3 space-y-2 text-left">
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                        <img src={photo.base64Data} alt="evidence" className="object-cover w-full h-full" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground block truncate">{photo.fileName}</span>
                      <p className="text-xs font-semibold text-foreground line-clamp-2">{photo.caption || 'Attached Evidence'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 border border-dashed border-border rounded-xl text-center flex flex-col items-center justify-center text-muted-foreground text-xs">
                  <span>No compliance photos captured yet. Select 'NO' on checklist items to record evidence.</span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Sticky Mobile/Bottom Save Toolbar */}
      {!readOnly && (
        <div className="fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border z-20 flex sm:hidden items-center justify-between px-4 shadow-lg backdrop-blur-md">
          <Button variant="outline" size="sm" onClick={() => onSave(session)} className="h-9 text-xs w-[47%]">
            <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
          </Button>
          <Button size="sm" onClick={handleFinalize} className="h-9 text-xs bg-primary hover:bg-primary/95 text-primary-foreground w-[47%]">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Submit Audit
          </Button>
        </div>
      )}
    </div>
  );
}
