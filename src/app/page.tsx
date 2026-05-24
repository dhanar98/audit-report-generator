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
import { DynamicChecklistSchema, DynamicAuditSession } from '@/types/dynamicSchema';
import { DynamicRunnerView } from '@/modules/components/DynamicRunnerView';

type AppView = 'dashboard' | 'upload' | 'builder' | 'runner' | 'report' | 'dynamic_runner';

const syncChannel = typeof window !== 'undefined' ? new BroadcastChannel('veriaudit-sync-channel') : null;

function convertV1ToV2(v1Schema: ChecklistSchema, v1Session: AuditSessionData): { v2Schema: DynamicChecklistSchema; v2Session: DynamicAuditSession } {
  const v2Components: any[] = [];
  
  v1Schema.sections.forEach(sec => {
    if (sec.type === 'header') {
      v2Components.push({
        id: sec.id,
        type: 'header',
        title: sec.title,
        subtitle: sec.description || '',
        description: '',
        category: 'General',
        required: false
      });
    } else if (sec.type === 'checklist') {
      v2Components.push({
        id: sec.id,
        type: 'checklist',
        title: sec.title,
        items: (sec.fields || []).map(f => ({
          id: f.id,
          question: f.title,
          riskLevel: f.riskLevel || 'LOW',
          targetResolveDays: f.recoMapping ? 7 : 0,
          required: f.required || false
        })),
        required: false
      });
    } else if (sec.type === 'table') {
      (sec.tables || []).forEach(tbl => {
        v2Components.push({
          id: tbl.id,
          type: 'table_grid',
          title: tbl.title,
          columns: (tbl.columns || []).map((col, idx) => ({
            id: `col_${idx}`,
            header: col,
            type: 'text'
          })),
          defaultRowCount: tbl.rows ? tbl.rows.length : 1,
          required: false
        });
      });
    } else if (sec.type === 'observation') {
      v2Components.push({
        id: sec.id,
        type: 'observation',
        title: sec.title,
        question: 'Detailed observation notes',
        placeholder: 'Enter notes...',
        allowImage: true,
        required: false
      });
    } else if (sec.type === 'signature') {
      v2Components.push({
        id: sec.id,
        type: 'signature',
        title: sec.title,
        placeholder: 'Auditor Signature',
        required: false
      });
    }
  });

  const v2Schema: DynamicChecklistSchema = {
    id: v1Schema.id || 'tpl_v1_converted',
    title: v1Schema.title,
    description: v1Schema.description || '',
    version: 2,
    components: v2Components
  };

  const v2Responses: any[] = [];

  v1Session.responses.forEach(resp => {
    for (const sec of v1Schema.sections) {
      if (sec.type === 'checklist' && sec.fields?.some(f => f.id === resp.fieldId)) {
        let compResp = v2Responses.find(r => r.componentId === sec.id);
        if (!compResp) {
          compResp = { componentId: sec.id, checklistAnswers: [] };
          v2Responses.push(compResp);
        }
        compResp.checklistAnswers.push({
          itemId: resp.fieldId,
          value: resp.value,
          remarks: resp.remarks || '',
          recommendation: resp.recommendation || '',
          photos: []
        });
      }
    }
  });

  if (v1Session.photos && v1Session.photos.length > 0) {
    const checklistComp = v2Components.find(c => c.type === 'checklist');
    if (checklistComp) {
      let compResp = v2Responses.find(r => r.componentId === checklistComp.id);
      if (!compResp) {
        compResp = { componentId: checklistComp.id, checklistAnswers: [] };
        v2Responses.push(compResp);
      }
      
      const noAnswers = compResp.checklistAnswers.filter((a: any) => a.value === 'NO');
      if (noAnswers.length > 0) {
        v1Session.photos.forEach((ph, idx) => {
          const targetAnswer = noAnswers[idx % noAnswers.length];
          if (targetAnswer) {
            if (!targetAnswer.photos) targetAnswer.photos = [];
            targetAnswer.photos.push(ph.base64Data);
          }
        });
      }
    }
  }

  v1Schema.sections.forEach(sec => {
    if (sec.type === 'table') {
      (sec.tables || []).forEach(tbl => {
        const tableRows: any[] = [];
        if (tbl.rows) {
          tbl.rows.forEach((row, rowIdx) => {
            (tbl.columns || []).forEach((col, colIdx) => {
              tableRows.push({
                rowId: `row_${rowIdx}`,
                colId: `col_${colIdx}`,
                value: row[colIdx] || ''
              });
            });
          });
        }
        v2Responses.push({
          componentId: tbl.id,
          tableRows
        });
      });
    }
  });

  const v2Session: DynamicAuditSession = {
    id: v1Session.id,
    schemaId: v1Schema.id || 'tpl_v1_converted',
    clientName: v1Session.clientName || '',
    siteName: v1Session.siteName || '',
    siteAddress: '',
    auditorName: v1Session.auditorName || '',
    status: v1Session.status as any,
    startedAt: v1Session.startedAt,
    completedAt: v1Session.completedAt || undefined,
    responses: v2Responses
  };

  return { v2Schema, v2Session };
}

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

  // Listen to cross-tab updates via BroadcastChannel
  useEffect(() => {
    if (!mounted || !syncChannel) return;

    const reloadData = async () => {
      const storedTemplates = await IndexedDBManager.getTemplates();
      const storedSessions = await IndexedDBManager.getSessions();
      setTemplates(storedTemplates as (ChecklistSchema & { id: string })[]);
      setSessions(storedSessions);
      
      // Update active session if it is being viewed/edited
      if (activeSession) {
        const freshSession = storedSessions.find(s => s.id === activeSession.id);
        if (freshSession) {
          setActiveSession(freshSession);
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TEMPLATES_UPDATED' || event.data.type === 'SESSIONS_UPDATED') {
        reloadData();
      }
    };

    syncChannel.addEventListener('message', handleMessage);
    return () => {
      syncChannel.removeEventListener('message', handleMessage);
    };
  }, [mounted, activeSession]);

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
      syncChannel?.postMessage({ type: 'TEMPLATES_UPDATED' });

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
    syncChannel?.postMessage({ type: 'TEMPLATES_UPDATED' });

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
    syncChannel?.postMessage({ type: 'TEMPLATES_UPDATED' });

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
    syncChannel?.postMessage({ type: 'TEMPLATES_UPDATED' });
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
  const handleSaveSession = async (session: AuditSessionData, silent = false) => {
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
    syncChannel?.postMessage({ type: 'SESSIONS_UPDATED' });

    if (!silent) {
      alert('Audit draft saved offline.');
    }
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
    syncChannel?.postMessage({ type: 'SESSIONS_UPDATED' });

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
        setActiveSession(session);
        setActiveSchema(template);
        setView('report');
      } else {
        alert(data.error || 'Report generation failed.');
      }
    } catch (err: any) {
      alert(`Report error: ${err.message}`);
    }
  };

  const handleExportV1Pdf = async () => {
    if (!activeSchema || !activeSession) return;
    try {
      const { v2Schema, v2Session } = convertV1ToV2(activeSchema, activeSession);
      const res = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: v2Schema, session: v2Session, format: 'pdf' })
      });

      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Report_${activeSchema.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`PDF export failed: ${e.message}`);
    }
  };

  const handleExportV1Docx = async () => {
    if (!activeSchema || !activeSession) return;
    try {
      const { v2Schema, v2Session } = convertV1ToV2(activeSchema, activeSession);
      const res = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: v2Schema, session: v2Session, format: 'docx' })
      });

      if (!res.ok) throw new Error('Failed to generate Word document');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Report_${activeSchema.title.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Word export failed: ${e.message}`);
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
      <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/80 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0" onClick={() => setView('dashboard')}>
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-foreground">
                VeriAudit<span className="text-primary"> Pro</span>
              </h1>
              <p className="hidden md:block text-[9px] text-muted-foreground -mt-0.5">Enterprise Checklist & Compliance Engine</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar">
            {([
              { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
              { key: 'upload', label: 'Templates', icon: <FileText className="w-3.5 h-3.5" /> },
              { key: 'dynamic_runner', label: 'Dynamic Engine v2', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
            ] as { key: AppView; label: string; icon: React.ReactNode }[]).map(item => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  view === item.key
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Online/Offline indicator */}
            <div className={`flex items-center space-x-1.5 text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border ${
              isOnline
                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : 'border-red-500/30 text-red-400 bg-red-500/10'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden xs:inline sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
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
                <Button size="sm" onClick={handleExportV1Pdf} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Download PDF
                </Button>
                <Button size="sm" onClick={handleExportV1Docx} className="h-8 text-xs bg-blue-600 hover:bg-blue-700">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Download Word
                </Button>
                <Button size="sm" onClick={handlePrintReport} className="h-8 text-xs bg-primary">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Preview
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
