'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  LayoutDashboard,
  Settings2,
  Play,
  Printer,
  PlusCircle,
  Trash2,
  Eye,
  Pencil,
  Loader2,
  Sparkles,
  WifiOff,
  Wifi,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChecklistBuilder } from '@/modules/builder/components/ChecklistBuilder';
import { AuditRunner } from '@/modules/audits/components/AuditRunner';
import { KPIDashboard } from '@/modules/dashboard/components/KPIDashboard';
import { IndexedDBManager } from '@/modules/offline/IndexedDBManager';
import { ChecklistSchema, AuditSessionData } from '@/types/schema';
import { DynamicRunnerView } from '@/modules/components/DynamicRunnerView';

type AppView = 'dashboard' | 'upload' | 'builder' | 'runner' | 'report' | 'dynamic_runner';

// Default empty schema for new blank template v2 (dynamic component engine)
const BLANK_SCHEMA_V2: any = {
  title: 'New Dynamic Audit Checklist',
  description: 'Create your dynamic multi-component audit template',
  version: 2,
  components: [
    {
      id: `comp_header`,
      type: 'header',
      title: 'General Scope & Inspection Info',
      subtitle: 'Facility Assessment Overview',
      description: 'Record auditor, date, and basic details.',
      required: true,
      category: 'Overview',
      riskLevel: 'LOW'
    }
  ]
};

// Default empty schema for new blank template
const BLANK_SCHEMA: ChecklistSchema = {
  id: `tpl_${Math.random().toString(36).substr(2, 9)}`,
  title: 'New Audit Checklist',
  description: 'Create your custom checklist from scratch',
  version: 1,
  sections: [
    {
      id: `sec_${Math.random().toString(36).substr(2, 9)}`,
      title: 'General Information',
      type: 'header',
      orderIndex: 0,
      fields: [
        {
          id: `field_${Math.random().toString(36).substr(2, 9)}`,
          title: 'Branch / Site Name',
          type: 'text',
          required: true,
          riskLevel: 'NONE',
        },
        {
          id: `field_${Math.random().toString(36).substr(2, 9)}`,
          title: 'Address',
          type: 'text',
          required: true,
          riskLevel: 'NONE',
        },
      ],
    },
  ],
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<AppView>('dashboard');
  const [templates, setTemplates] = useState<(ChecklistSchema & { id: string })[]>([]);
  const [sessions, setSessions] = useState<AuditSessionData[]>([]);
  const [activeSchema, setActiveSchema] = useState<ChecklistSchema | null>(null);
  const [activeSession, setActiveSession] = useState<AuditSessionData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydration safe mount
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Register Service Worker in production only
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Load data from IndexedDB
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const storedTemplates = await IndexedDBManager.getTemplates();
      const storedSessions = await IndexedDBManager.getSessions();
      setTemplates(storedTemplates as (ChecklistSchema & { id: string })[]);
      setSessions(storedSessions);
    })();
  }, [mounted]);

  // --- Trigger Database Sync ---
  const triggerSync = async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      const queue = await IndexedDBManager.getSyncQueue();
      if (queue.length === 0) return;

      console.log(`Syncing ${queue.length} items to database...`);
      const payload = queue.map(item => ({
        id: item.id,
        type: item.type,
        data: item.data
      }));

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const result = await res.json();
      
      if (result.results && Array.isArray(result.results)) {
        let successCount = 0;
        for (const itemResult of result.results) {
          if (itemResult.status === 'success') {
            await IndexedDBManager.removeFromSyncQueue(Number(itemResult.id));
            successCount++;
          }
        }
        if (successCount > 0) {
          console.log(`Successfully synced ${successCount} items to database!`);
        }
      }
    } catch (err: any) {
      console.error('Offline database sync failed:', err.message);
    }
  };

  // Sync loop trigger when online
  useEffect(() => {
    if (!mounted || !isOnline) return;

    triggerSync();

    const interval = setInterval(() => {
      triggerSync();
    }, 15000); // Sync every 15 seconds

    return () => clearInterval(interval);
  }, [mounted, isOnline]);

  // --- Handler: Upload & Parse DOCX ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parser', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(`Parse failed: ${err.error}`);
        setIsUploading(false);
        return;
      }

      const parsedSchema: ChecklistSchema = await res.json();
      // Assign an ID if not present
      const schemaWithId = { ...parsedSchema, id: parsedSchema.id || `tpl_${Math.random().toString(36).substr(2, 9)}` };

      // Save to IndexedDB
      await IndexedDBManager.saveTemplate(schemaWithId);
      setTemplates(prev => [...prev, schemaWithId]);

      // Queue offline sync
      await IndexedDBManager.addToSyncQueue({
        type: 'publish_template',
        data: schemaWithId
      });
      triggerSync();

      // Open in builder
      setActiveSchema(schemaWithId);
      setView('builder');
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Handler: Create Blank Template ---
  const handleCreateBlank = () => {
    const blankWithId = {
      ...BLANK_SCHEMA,
      id: `tpl_${Math.random().toString(36).substr(2, 9)}`,
      sections: BLANK_SCHEMA.sections.map(s => ({
        ...s,
        id: `sec_${Math.random().toString(36).substr(2, 9)}`,
        fields: s.fields?.map(f => ({ ...f, id: `field_${Math.random().toString(36).substr(2, 9)}` }))
      }))
    };
    setActiveSchema(blankWithId);
    setView('builder');
  };

  // --- Handler: Create Blank Template V2 ---
  const handleCreateBlankV2 = () => {
    const blankWithId = {
      ...BLANK_SCHEMA_V2,
      id: `tpl_${Math.random().toString(36).substr(2, 9)}`,
      components: BLANK_SCHEMA_V2.components.map((comp: any) => ({
        ...comp,
        id: `comp_${Math.random().toString(36).substr(2, 9)}`
      }))
    };
    setActiveSchema(blankWithId as any);
    setView('builder');
  };

  // --- Handler: Save Draft ---
  const handleSaveDraft = async (schema: any) => {
    const schemaWithId = { ...schema, id: schema.id || `tpl_${Math.random().toString(36).substr(2, 9)}` };
    await IndexedDBManager.saveTemplate(schemaWithId);
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === schemaWithId.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = schemaWithId;
        return updated;
      }
      return [...prev, schemaWithId];
    });

    // Queue offline sync
    await IndexedDBManager.addToSyncQueue({
      type: 'publish_template',
      data: schemaWithId
    });
    triggerSync();

    alert('Template draft saved to local storage.');
  };

  // --- Handler: Publish Template ---
  const handlePublish = async (schema: any) => {
    const schemaWithId = { ...schema, id: schema.id || `tpl_${Math.random().toString(36).substr(2, 9)}` };
    await IndexedDBManager.saveTemplate(schemaWithId);
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === schemaWithId.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = schemaWithId;
        return updated;
      }
      return [...prev, schemaWithId];
    });

    // Queue offline sync
    await IndexedDBManager.addToSyncQueue({
      type: 'publish_template',
      data: schemaWithId
    });
    triggerSync();

    setView('dashboard');
    alert('Template published successfully!');
  };

  // --- Handler: Edit Template ---
  const handleEditTemplate = (template: ChecklistSchema & { id: string }) => {
    setActiveSchema(template);
    setView('builder');
  };

  // --- Handler: Delete Template ---
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template permanently?')) return;
    await IndexedDBManager.deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // --- Handler: Start Audit ---
  const handleStartAudit = (template: ChecklistSchema & { id: string }) => {
    setActiveSchema(template);
    setActiveSession(null);
    if ((template as any).version === 2) {
      setView('dynamic_runner');
    } else {
      setView('runner');
    }
  };

  // --- Handler: Resume Audit ---
  const handleResumeAudit = (session: AuditSessionData) => {
    const template = templates.find(t => t.id === session.checklistId);
    if (!template) {
      alert("The template for this session could not be found.");
      return;
    }
    setActiveSchema(template);
    setActiveSession(session);
    if (template.version === 2) {
      setView('dynamic_runner');
    } else {
      setView('runner');
    }
  };

  // --- Handler: Save Audit Session ---
  const handleSaveSession = async (session: AuditSessionData) => {
    await IndexedDBManager.saveSession(session);
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = session;
        return updated;
      }
      return [...prev, session];
    });

    // Queue offline sync
    await IndexedDBManager.addToSyncQueue({
      type: 'save_session',
      data: session
    });
    triggerSync();

    alert('Audit draft saved offline.');
  };

  // --- Handler: Complete Audit ---
  const handleCompleteAudit = async (session: AuditSessionData) => {
    await IndexedDBManager.saveSession(session);
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = session;
        return updated;
      }
      return [...prev, session];
    });

    // Queue offline sync
    await IndexedDBManager.addToSyncQueue({
      type: 'save_session',
      data: session
    });
    triggerSync();

    alert('Audit completed and saved!');
    setView('dashboard');
  };

  // --- Handler: Generate Report ---
  const handleGenerateReport = async (session: AuditSessionData) => {
    const template = templates.find(t => t.id === session.checklistId);
    if (!template) {
      alert('Template not found for this session.');
      return;
    }

    if ((template as any).version === 2) {
      try {
        const res = await fetch('/api/reports/dynamic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema: template, session, format: 'pdf' })
        });
        if (!res.ok) throw new Error('Failed to generate PDF');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Audit_Report_${template.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e: any) {
        alert(`PDF generation failed: ${e.message}`);
      }
      return;
    }

    // Calculate score
    let score = 100;
    template.sections.forEach(sec => {
      if (sec.type === 'checklist' && sec.fields) {
        sec.fields.forEach(field => {
          const resp = session.responses.find(r => r.fieldId === field.id);
          if (resp?.value === 'NO') {
            if (field.riskLevel === 'HIGH') score -= 15;
            else if (field.riskLevel === 'MEDIUM') score -= 8;
            else score -= 3;
          }
        });
      }
    });
    score = Math.max(0, score);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: template, session, score }),
      });
      const data = await res.json();
      if (data.html) {
        setReportHtml(data.html);
        setView('report');
      } else {
        alert(data.error || 'Report generation failed.');
      }
    } catch (err: any) {
      alert(`Report error: ${err.message}`);
    }
  };

  // --- Handler: Print Report ---
  const handlePrintReport = () => {
    if (!reportHtml) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Loading VeriAudit Pro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/80 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('dashboard')}>
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                VeriAudit<span className="text-primary"> Pro</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Enterprise Checklist & Compliance Engine</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1">
            {([
              { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { key: 'upload', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
              { key: 'dynamic_runner', label: 'Dynamic Engine v2', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
            ] as { key: AppView; label: string; icon: React.ReactNode }[]).map(item => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  view === item.key
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-3">
            {/* Online/Offline indicator */}
            <div className={`flex items-center space-x-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full border ${
              isOnline
                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : 'border-red-500/30 text-red-400 bg-red-500/10'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground">KPI Analytics Dashboard</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time compliance metrics, risk analysis, and audit performance.</p>
              </div>
              <Button size="sm" onClick={() => setView('upload')} className="bg-primary hover:bg-primary/90">
                <PlusCircle className="w-4 h-4 mr-2" /> New Template
              </Button>
            </div>
            <KPIDashboard sessions={sessions} templates={templates} onResumeSession={handleResumeAudit} />
          </div>
        )}

        {/* TEMPLATES (UPLOAD) VIEW */}
        {view === 'upload' && (
          <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
            <div>
              <h2 className="text-xl font-black text-foreground">Checklist Templates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Upload Word documents or build checklists from scratch.</p>
            </div>

            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* DOCX Upload Card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="glass-panel p-8 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-primary/40 group min-h-[200px]"
              >
                {isUploading ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors group-hover:scale-110 transition-transform" />
                )}
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground block">Upload Word Template (.docx)</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Parser engine auto-generates checklist schema from headings, tables, and checkboxes.
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Blank Template Card (V1) */}
              <div
                onClick={handleCreateBlank}
                className="glass-panel p-8 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-primary/40 group min-h-[200px]"
              >
                <Sparkles className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground block">Create Standard Template (v1)</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Build classic checklists with custom sections and standard fields.
                  </span>
                </div>
              </div>

              {/* Blank Template Card (V2 - Dynamic Components) */}
              <div
                onClick={handleCreateBlankV2}
                className="glass-panel p-8 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-primary/40 group min-h-[200px] border-amber-500/20 hover:border-amber-500/40"
              >
                <Sparkles className="w-10 h-10 text-amber-500/60 group-hover:text-amber-500 transition-colors group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground block">Create Dynamic Template (v2)</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Build dynamic checklist, spreadsheet calculation grids, signatures, and camera modules.
                  </span>
                </div>
              </div>
            </div>

            {/* Templates List */}
            {templates.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Saved Templates ({templates.length})</h3>
                <div className="space-y-3">
                  {templates.map(template => (
                    <div key={template.id} className="glass-panel p-5 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground block">{template.title}</span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {template.version === 2 ? (template as any).components?.length : template.sections?.length} sections/components • v{template.version} • {template.description?.substring(0, 60)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)} className="h-8 text-xs">
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => handleStartAudit(template)} className="h-8 text-xs bg-green-600 hover:bg-green-700">
                          <Play className="w-3.5 h-3.5 mr-1" /> Run Audit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)} className="h-8 text-xs text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* In-Progress Sessions list */}
                {sessions.filter(s => s.status === 'In_Progress').length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">In-Progress Audit Sessions</h3>
                    <div className="space-y-3">
                      {sessions.filter(s => s.status === 'In_Progress').map(session => (
                        <div key={session.id} className="glass-panel p-4 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-foreground block">{session.siteName}</span>
                            <span className="text-[10px] text-muted-foreground">{session.clientName} • Started {new Date(session.startedAt).toLocaleDateString()}</span>
                          </div>
                          <Button size="sm" onClick={() => handleResumeAudit(session)} className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit / Resume
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sessions list with report generation */}
                {sessions.filter(s => s.status === 'Completed').length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Completed Audit Sessions</h3>
                    <div className="space-y-3">
                      {sessions.filter(s => s.status === 'Completed').map(session => (
                        <div key={session.id} className="glass-panel p-4 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-foreground block">{session.siteName}</span>
                            <span className="text-[10px] text-muted-foreground">{session.clientName} • Completed {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : ''}</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleGenerateReport(session)} className="h-8 text-xs">
                            <Printer className="w-3.5 h-3.5 mr-1" /> Generate PDF Report
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BUILDER VIEW */}
        {view === 'builder' && activeSchema && (
          <ChecklistBuilder
            initialSchema={activeSchema}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
          />
        )}

        {/* RUNNER VIEW */}
        {view === 'runner' && activeSchema && (
          <AuditRunner
            schema={activeSchema}
            initialSession={activeSession}
            onSave={handleSaveSession}
            onComplete={handleCompleteAudit}
            onBack={() => setView('upload')}
          />
        )}

        {/* REPORT VIEW */}
        {view === 'report' && reportHtml && (
          <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">Report Preview</h2>
              <div className="flex items-center space-x-3">
                <Button size="sm" variant="outline" onClick={() => setView('dashboard')} className="h-8 text-xs">
                  ← Back to Dashboard
                </Button>
                <Button size="sm" onClick={handlePrintReport} className="h-8 text-xs bg-primary">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print / Export PDF
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-border/50">
              <iframe
                srcDoc={reportHtml}
                className="w-full min-h-[800px] border-none"
                title="Audit Report Preview"
              />
            </div>
          </div>
        )}

        {/* DYNAMIC RUNNER VIEW */}
        {view === 'dynamic_runner' && (
          <DynamicRunnerView schema={activeSchema as any} onBack={() => setView('dashboard')} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 px-6 text-center">
        <span className="text-[10px] text-muted-foreground">
          VeriAudit Pro • Enterprise Compliance & Checklist Builder • © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
