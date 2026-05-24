import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Image as ImageIcon,
  Save,
  CheckCircle,
  FileText,
  AlertOctagon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableEditor } from '../../builder/components/TableEditor';
import { 
  ChecklistSchema, 
  TemplateSectionSchema, 
  TemplateFieldSchema,
  AuditSessionData,
  AuditResponse,
  RiskLevel
} from '@/types/schema';

interface AuditRunnerProps {
  schema: ChecklistSchema;
  initialSession?: AuditSessionData | null;
  onSave: (session: AuditSessionData) => void;
  onComplete: (session: AuditSessionData) => void;
  onBack: () => void;
}

export function AuditRunner({ schema, initialSession, onSave, onComplete, onBack }: AuditRunnerProps) {
  // Setup session state
  const [session, setSession] = useState<AuditSessionData>(() => {
    if (initialSession) return initialSession;
    
    return {
      id: `session_${Math.random().toString(36).substr(2, 9)}`,
      checklistId: schema.id || 'default_checklist',
      siteId: 'site_1',
      siteName: 'Main Street Corporate Branch',
      clientName: 'Indian Bank',
      auditorId: 'usr_1',
      auditorName: 'Dhanasekaran Ravichandran',
      status: 'In_Progress',
      startedAt: new Date().toISOString(),
      responses: [],
      photos: []
    };
  });

  const [activeSecIndex, setActiveSecIndex] = useState<number>(0);
  const activeSection = schema.sections[activeSecIndex] || null;

  // Sync initialSession updates
  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
    }
  }, [initialSession]);

  // Helpers to get/set responses
  const getResponse = (fieldId: string): AuditResponse | undefined => {
    return session.responses.find(r => r.fieldId === fieldId);
  };

  const updateResponse = (fieldId: string, updates: Partial<AuditResponse>) => {
    setSession(prev => {
      const existingIdx = prev.responses.findIndex(r => r.fieldId === fieldId);
      const updatedResponses = [...prev.responses];
      
      if (existingIdx > -1) {
        updatedResponses[existingIdx] = {
          ...updatedResponses[existingIdx],
          ...updates
        };
      } else {
        updatedResponses.push({
          fieldId,
          value: '',
          ...updates
        });
      }

      return {
        ...prev,
        responses: updatedResponses
      };
    });
  };

  // Image compressor & converter to base64 WebP
  const handleImageUpload = (fieldId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check limit: max 3 images per session/checkpoint
    const existingPhotosCount = session.photos.length;
    if (existingPhotosCount >= 3) {
      alert("Maximum of 3 photographs can be uploaded per audit session.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Draw to canvas for compression to webp
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to WebP base64 with 0.7 quality
        const compressedBase64 = canvas.toDataURL('image/webp', 0.7);

        // Append photo
        const newPhoto = {
          id: `photo_${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name.replace(/\.[^/.]+$/, "") + '.webp',
          mimeType: 'image/webp',
          base64Data: compressedBase64,
          caption: `Photo for checkpoint ${fieldId}`
        };

        setSession(prev => ({
          ...prev,
          photos: [...prev.photos, newPhoto]
        }));

        // Link response to this photo ID if needed, or save in session photos
        const currentResp = getResponse(fieldId);
        const remarksWithPhoto = `${currentResp?.remarks || ''} [Photo Attached]`.trim();
        updateResponse(fieldId, { remarks: remarksWithPhoto });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (photoId: string) => {
    setSession(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId)
    }));
  };

  // Score Calculation
  // Max score = 100.
  // Deduction for failure based on riskLevel: HIGH = -15, MEDIUM = -8, LOW = -3.
  const calculateComplianceScore = (): number => {
    let score = 100;
    
    schema.sections.forEach(sec => {
      if (sec.type === 'checklist' && sec.fields) {
        sec.fields.forEach(field => {
          const resp = session.responses.find(r => r.fieldId === field.id);
          if (resp && resp.value === 'NO') {
            if (field.riskLevel === 'HIGH') score -= 15;
            else if (field.riskLevel === 'MEDIUM') score -= 8;
            else if (field.riskLevel === 'LOW') score -= 3;
          }
        });
      }
    });

    return Math.max(0, score);
  };

  // Save session
  const saveDraft = () => {
    onSave(session);
  };

  // Complete session
  const completeAudit = () => {
    // Validate required fields
    let missingRequired = false;
    schema.sections.forEach(sec => {
      if (sec.fields) {
        sec.fields.forEach(field => {
          if (field.required) {
            const resp = getResponse(field.id);
            if (!resp || resp.value === '') {
              missingRequired = true;
            }
          }
        });
      }
    });

    if (missingRequired) {
      alert("Some required audit checkpoints have not been answered yet. Please check and complete them before submitting.");
      return;
    }

    onComplete({
      ...session,
      status: 'Completed',
      completedAt: new Date().toISOString()
    });
  };

  const currentScore = calculateComplianceScore();

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden">
      {/* Top dashboard info header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 bg-card/65 border-b border-border/80 z-10 backdrop-blur-md gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex flex-col space-y-0.5 text-left min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-primary truncate max-w-[200px] sm:max-w-xs">{schema.title}</h3>
              <span className="hidden xs:inline-block text-[9px] font-mono px-1.5 py-0.5 bg-muted text-muted-foreground rounded border border-border shrink-0">
                Draft
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {session.auditorName} • {session.siteName}
            </p>
          </div>

          {/* Compliance Gauge on mobile next to title */}
          <div className="flex flex-col items-end sm:hidden shrink-0">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</span>
            <span className={`text-sm font-black ${
              currentScore >= 85 ? 'text-green-400' :
              currentScore >= 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {currentScore}%
            </span>
          </div>
        </div>
        
        {/* Compliance Gauge and actions in Header - Desktop only */}
        <div className="hidden sm:flex items-center space-x-4 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Safety Score</span>
            <span className={`text-base font-black ${
              currentScore >= 85 ? 'text-green-400' :
              currentScore >= 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {currentScore}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={saveDraft} className="h-8 text-xs border-primary/20 text-foreground">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
            </Button>
            <Button size="sm" onClick={completeAudit} className="h-8 text-xs bg-primary hover:bg-primary/95 text-primary-foreground">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Finalize Audit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Runner Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT BAR: Stepper Progress indicator */}
        <div className="hidden md:block w-64 bg-muted/10 border-r border-border/80 p-4 overflow-y-auto space-y-3 shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Audit Sections</span>
          {schema.sections.map((sec, index) => (
            <div
              key={sec.id}
              onClick={() => setActiveSecIndex(index)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                activeSecIndex === index
                  ? 'bg-primary/10 border-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-card/40 border-border/60 hover:bg-card/70'
              }`}
            >
              <div className="text-xs truncate">{sec.title}</div>
              <span className="text-[10px] text-muted-foreground capitalize block mt-0.5">{sec.type} section</span>
            </div>
          ))}
          <Button variant="ghost" size="xs" onClick={onBack} className="w-full justify-start text-xs text-muted-foreground mt-4 hover:text-foreground">
            ← Back to Templates
          </Button>
        </div>

        {/* CENTER CANVA: Active Section execution inputs */}
        <div className="flex-1 bg-background overflow-y-auto p-4 sm:p-6 pb-24 flex flex-col space-y-6">
          {/* Mobile active section selector */}
          <div className="md:hidden flex items-center justify-between gap-2 mb-2 text-left shrink-0">
            <Button variant="ghost" size="xs" onClick={onBack} className="h-8 w-8 p-0 rounded-full flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <select
              value={activeSecIndex}
              onChange={(e) => setActiveSecIndex(Number(e.target.value))}
              className="flex-1 h-8 text-xs rounded-lg border border-border/80 bg-card px-2 text-foreground focus:border-primary focus:outline-none"
            >
              {schema.sections.map((sec, index) => (
                <option key={sec.id} value={index}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>
          {activeSection ? (
            <div className="max-w-3xl mx-auto w-full space-y-6">
              <div className="border-b border-border/80 pb-3">
                <h4 className="text-base font-bold text-foreground">{activeSection.title}</h4>
                {activeSection.description && (
                  <p className="text-xs text-muted-foreground mt-1">{activeSection.description}</p>
                )}
              </div>

              {/* Table section render */}
              {activeSection.type === 'table' && activeSection.tables ? (
                <div className="space-y-6">
                  {activeSection.tables.map((table) => (
                    <TableEditor
                      key={table.id}
                      table={table}
                      onChange={() => {}} // Read-only helper wrapper or live entry updates if needed
                      readOnly={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSection.fields?.map((field) => {
                    const resp = getResponse(field.id) || { fieldId: field.id, value: '' };
                    
                    return (
                      <div key={field.id} className="p-4 rounded-xl border border-border/80 bg-card/25 backdrop-blur-md space-y-3">
                        <div className="flex items-start justify-between">
                          <label className="text-sm font-medium text-foreground/90 leading-tight">
                            {field.title} {field.required && <span className="text-red-400">*</span>}
                          </label>
                          {field.riskLevel !== 'NONE' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              field.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              field.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {field.riskLevel}
                            </span>
                          )}
                        </div>

                        {/* Rendering based on field type */}
                        {field.type === 'yes_no' && (
                          <div className="space-y-3">
                            <div className="flex space-x-2">
                              {['YES', 'NO', 'N/A'].map((opt) => {
                                const isSelected = resp.value === opt;
                                return (
                                  <Button
                                    key={opt}
                                    size="sm"
                                    variant={isSelected ? 'default' : 'outline'}
                                    onClick={() => {
                                      // If user clicks NO, automatically trigger standard recommendation
                                      const recommendation = opt === 'NO' ? (field.recoMapping || 'Rectification needed.') : '';
                                      updateResponse(field.id, { 
                                        value: opt,
                                        recommendation
                                      });
                                    }}
                                    className={`h-8 px-4 text-xs font-semibold ${
                                      isSelected && opt === 'YES' ? 'bg-green-600 hover:bg-green-700' :
                                      isSelected && opt === 'NO' ? 'bg-red-600 hover:bg-red-700' :
                                      isSelected && opt === 'N/A' ? 'bg-muted-foreground' : ''
                                    }`}
                                  >
                                    {opt}
                                  </Button>
                                );
                              })}
                            </div>

                            {/* Failure Details: Remarks & Photos triggered if response is NO */}
                            {resp.value === 'NO' && (
                              <div className="border border-red-500/30 bg-red-500/5 p-3 rounded-lg space-y-3 transition-all duration-200">
                                <div className="flex items-center space-x-2 text-red-400">
                                  <AlertOctagon className="w-4 h-4" />
                                  <span className="text-xs font-bold uppercase tracking-wider">Non-Compliant Remediation Block</span>
                                </div>
                                
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-semibold block">Automatic Recommendation Map</span>
                                  <Input
                                    value={resp.recommendation || ''}
                                    onChange={(e) => updateResponse(field.id, { recommendation: e.target.value })}
                                    className="h-8 text-xs bg-card border-red-500/20 focus:border-red-500"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-semibold block">Observations & Audit Remarks</span>
                                  <Textarea
                                    value={resp.remarks || ''}
                                    onChange={(e) => updateResponse(field.id, { remarks: e.target.value })}
                                    placeholder="Provide description of hazard, wiring issues, load imbalance etc."
                                    className="text-xs min-h-[50px] bg-card border-red-500/20 focus:border-red-500"
                                  />
                                </div>

                                {/* Camera integration */}
                                <div className="space-y-2">
                                  <span className="text-[10px] text-muted-foreground font-semibold block">Photo Evidence (Max 3)</span>
                                  <div className="flex items-center space-x-2">
                                    <label className="cursor-pointer flex items-center justify-center h-8 px-3 rounded border border-dashed border-red-500/30 hover:border-red-500 text-xs text-red-400 font-semibold space-x-1">
                                      <Camera className="w-3.5 h-3.5" />
                                      <span>Capture Evidence</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(field.id, e)}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>

                                  {/* Render uploaded base64 photos for this session */}
                                  {session.photos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 pt-2">
                                      {session.photos.map((photo) => (
                                        <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border/80 bg-muted/10 h-16 w-full">
                                          <img src={photo.base64Data} alt="evidence" className="object-cover w-full h-full" />
                                          <button
                                            onClick={() => deletePhoto(photo.id)}
                                            className="absolute top-1 right-1 bg-red-600/90 text-white rounded p-0.5 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {field.type === 'text' && (
                          <Input
                            value={resp.value || ''}
                            onChange={(e) => updateResponse(field.id, { value: e.target.value })}
                            className="bg-card border-border/60 focus:border-primary h-9 text-xs"
                            placeholder="Enter text value"
                          />
                        )}

                        {field.type === 'textarea' && (
                          <Textarea
                            value={resp.value || ''}
                            onChange={(e) => updateResponse(field.id, { value: e.target.value })}
                            className="bg-card border-border/60 focus:border-primary text-xs"
                            placeholder="Write observations..."
                          />
                        )}

                        {field.type === 'signature' && (
                          <div className="space-y-2">
                            <Input
                              value={resp.value || ''}
                              onChange={(e) => updateResponse(field.id, { value: e.target.value })}
                              placeholder="Type Auditor / Branch Manager Name as Signature Authorization"
                              className="bg-card border-border/60 focus:border-primary h-9 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Pagination keys */}
              <div className="flex justify-between items-center pt-6 border-t border-border/70">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeSecIndex === 0}
                  onClick={() => setActiveSecIndex(prev => prev - 1)}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous Section
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {activeSecIndex + 1} of {schema.sections.length}
                </span>
                <Button
                  size="sm"
                  disabled={activeSecIndex === schema.sections.length - 1}
                  onClick={() => setActiveSecIndex(prev => prev + 1)}
                  className="h-8 text-xs bg-primary hover:bg-primary/95 text-primary-foreground"
                >
                  Next Section <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground">Select a section on the left to execute checkpoints.</span>
            </div>
          )}
        </div>

      </div>

      {/* Sticky Mobile/Bottom Save Toolbar */}
      <div className="fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border z-20 flex sm:hidden items-center justify-between px-4 shadow-lg backdrop-blur-md">
        <Button variant="outline" size="sm" onClick={saveDraft} className="h-9 text-xs w-[47%]">
          <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
        </Button>
        <Button size="sm" onClick={completeAudit} className="h-9 text-xs bg-primary hover:bg-primary/95 text-primary-foreground w-[47%]">
          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Submit Audit
        </Button>
      </div>
    </div>
  );
}
