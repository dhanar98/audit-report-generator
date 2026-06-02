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
  Shield,
  Building2,
  Users,
  LogOut,
  FileSpreadsheet,
  Plus,
  Search,
  Key,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChecklistBuilder } from '@/modules/builder/components/ChecklistBuilder';
import { AuditRunner } from '@/modules/audits/components/AuditRunner';
import { KPIDashboard } from '@/modules/dashboard/components/KPIDashboard';
import { IndexedDBManager } from '@/modules/offline/IndexedDBManager';
import { ChecklistSchema, AuditSessionData, TemplateSectionSchema, TemplateFieldSchema } from '@/types/schema';
import { DynamicChecklistSchema, DynamicAuditSession } from '@/types/dynamicSchema';
import { DynamicRunnerView } from '@/modules/components/DynamicRunnerView';
import { COMPREHENSIVE_DYNAMIC_SCHEMA } from '@/utils/dynamicAuditMock';

type AppView = 'dashboard' | 'upload' | 'builder' | 'runner' | 'report' | 'clients' | 'auditors';

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
        required: false,
        fields: (sec.fields || []).map(f => ({
          id: f.id,
          title: f.title,
          type: f.type || 'text'
        }))
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
          columns: (tbl.columns || []).map((col, idx) => {
            if (typeof col === 'string') {
              return {
                id: `col_${idx}`,
                header: col,
                type: 'text'
              };
            }
            return {
              id: col.id || `col_${idx}`,
              header: col.header || '',
              type: col.type || 'text',
              calculation: col.calculation || 'NONE',
              options: col.options || []
            };
          }),
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
    let belongsToChecklist = false;
    for (const sec of v1Schema.sections) {
      if (sec.type === 'checklist' && sec.fields?.some(f => f.id === resp.fieldId)) {
        belongsToChecklist = true;
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
        break;
      }
    }

    if (!belongsToChecklist) {
      // Find matching section in v1 schema
      const fieldSec = v1Schema.sections.find(sec => sec.fields?.some(f => f.id === resp.fieldId));

      if (fieldSec) {
        if (fieldSec.type === 'header') {
          v2Responses.push({
            componentId: resp.fieldId,
            value: resp.value || ''
          });
        } else if (fieldSec.type === 'signature') {
          v2Responses.push({
            componentId: fieldSec.id,
            signatureBase64: resp.signatureBase64 || resp.value || ''
          });
        } else if (fieldSec.type === 'observation') {
          v2Responses.push({
            componentId: fieldSec.id,
            observationAnswer: {
              answer: resp.value || '',
              remarks: resp.remarks || '',
              recommendation: resp.recommendation || ''
            }
          });
        }
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
        const sessionResp = v1Session.responses.find(r => r.fieldId === tbl.id);
        
        if (sessionResp && sessionResp.tableRows && sessionResp.tableRows.length > 0) {
          sessionResp.tableRows.forEach(cell => {
            tableRows.push({
              rowId: cell.rowId,
              colId: cell.colId,
              value: cell.value || ''
            });
          });
        } else if (tbl.rows) {
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

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Clients Master State
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');

  // Auditors Master State
  const [auditors, setAuditors] = useState<any[]>([]);
  const [auditorsLoading, setAuditorsLoading] = useState(false);
  const [newAuditorName, setNewAuditorName] = useState('');
  const [newAuditorEmail, setNewAuditorEmail] = useState('');
  const [newAuditorPassword, setNewAuditorPassword] = useState('');
  const [editingAuditorId, setEditingAuditorId] = useState<string | null>(null);
  const [editingAuditorName, setEditingAuditorName] = useState('');
  const [editingAuditorEmail, setEditingAuditorEmail] = useState('');
  const [editingAuditorPassword, setEditingAuditorPassword] = useState('');

  // Hydration safe mount and auth check
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

    // Check Auth status
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
        setAuthLoading(false);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthLoading(false);
      });

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

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      if (data.success) {
        setCurrentUser(data.user);
        setLoginEmail('');
        setLoginPassword('');
        setView('dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setView('dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  // --- Master Data Fetchers ---
  const fetchClients = async () => {
    if (!isOnline) return;
    setClientsLoading(true);
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchAuditors = async () => {
    if (!isOnline) return;
    setAuditorsLoading(true);
    try {
      const res = await fetch('/api/auditors');
      if (res.ok) {
        const data = await res.json();
        setAuditors(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuditorsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && isOnline) {
      if (view === 'clients') fetchClients();
      if (view === 'auditors') fetchAuditors();
    }
  }, [currentUser, view, isOnline]);

  // --- Client CRUD Handlers ---
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName })
      });
      if (res.ok) {
        setNewClientName('');
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClientId || !editingClientName) return;
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingClientId, name: editingClientName })
      });
      if (res.ok) {
        setEditingClientId(null);
        setEditingClientName('');
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const res = await fetch(`/api/clients?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportClientsCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const clientsList = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols[0]) {
          clientsList.push({ name: cols[0] });
        }
      }
      
      if (clientsList.length > 0) {
        try {
          const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientsList)
          });
          if (res.ok) {
            alert(`Successfully imported ${clientsList.length} clients!`);
            fetchClients();
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    reader.readAsText(file);
  };

  // --- Auditor CRUD Handlers ---
  const handleCreateAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditorName || !newAuditorEmail || !newAuditorPassword) return;
    try {
      const res = await fetch('/api/auditors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAuditorName,
          email: newAuditorEmail,
          password: newAuditorPassword
        })
      });
      if (res.ok) {
        setNewAuditorName('');
        setNewAuditorEmail('');
        setNewAuditorPassword('');
        fetchAuditors();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create auditor');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuditorId || !editingAuditorName || !editingAuditorEmail) return;
    try {
      const payload: any = {
        id: editingAuditorId,
        name: editingAuditorName,
        email: editingAuditorEmail
      };
      if (editingAuditorPassword) {
        payload.password = editingAuditorPassword;
      }
      const res = await fetch('/api/auditors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingAuditorId(null);
        setEditingAuditorName('');
        setEditingAuditorEmail('');
        setEditingAuditorPassword('');
        fetchAuditors();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update auditor');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAuditor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auditor?')) return;
    try {
      const res = await fetch(`/api/auditors?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAuditors();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportAuditorsCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const auditorsList = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols[0] && cols[1]) {
          auditorsList.push({
            name: cols[0],
            email: cols[1],
            password: cols[2] || 'Welcome@123'
          });
        }
      }
      
      if (auditorsList.length > 0) {
        try {
          const res = await fetch('/api/auditors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auditorsList)
          });
          if (res.ok) {
            alert(`Successfully imported ${auditorsList.length} auditors!`);
            fetchAuditors();
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    reader.readAsText(file);
  };

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
    setView('runner');
  };

  // --- Handler: Resume Audit ---
  const handleResumeAudit = (session: AuditSessionData) => {
    let template = templates.find(t => t.id === session.checklistId);
    if (!template) {
      alert("The template for this session could not be found.");
      return;
    }
    setActiveSchema(template);
    setActiveSession(session);
    setView('runner');
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
          <span className="text-sm text-muted-foreground">Loading Aura Veritas...</span>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <span className="text-sm text-gray-400 font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4 relative overflow-hidden font-sans">
        {/* Ambient background decoration */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl p-8 z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Aura Veritas</h2>
            <p className="text-xs text-gray-400 mt-1">Audit Compliance & Reporting Engine</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold text-center">
                {loginError}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <Button type="submit" className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm border-none">
              Sign In
            </Button>
          </form>
          
          <div className="mt-6 border-t border-white/[0.06] pt-4 text-center">
            <span className="text-[10px] text-gray-500">
              Demo logins: admin@example.com / AdminPassword123
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/80 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0" onClick={() => setView('dashboard')}>
            <img src="/av-logo.png" alt="Aura Veritas Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-primary font-display">
                Aura Veritas
              </h1>
              <p className="hidden md:block text-[9px] text-muted-foreground -mt-0.5">Offline-Enabled Audit Compliance PWA</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar">
            {([
              { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" />, show: true },
              { key: 'upload', label: 'Templates', icon: <FileText className="w-3.5 h-3.5" />, show: currentUser.role === 'ADMIN' || currentUser.role === 'AUDITOR' },
              { key: 'clients', label: 'Clients', icon: <Building2 className="w-3.5 h-3.5" />, show: currentUser.role === 'ADMIN' },
              { key: 'auditors', label: 'Auditors', icon: <Users className="w-3.5 h-3.5" />, show: currentUser.role === 'ADMIN' },
            ] as { key: AppView; label: string; icon: React.ReactNode; show: boolean }[])
              .filter(item => item.show)
              .map(item => (
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
              ))
            }
          </nav>

          <div className="flex items-center space-x-3 shrink-0">
            {/* User badge */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-foreground">{currentUser.name}</span>
              <span className="text-[9px] text-muted-foreground">{currentUser.role}</span>
            </div>

            {/* Online/Offline indicator */}
            <div className={`flex items-center space-x-1.5 text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border ${
              isOnline
                ? 'border-[#3BB885]/30 text-[#2A9068] bg-[#D4F2E8]'
                : 'border-[#E8524A]/30 text-[#C03A33] bg-[#FCE4E4]'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden xs:inline sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
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

        {/* CLIENTS VIEW */}
        {view === 'clients' && (
          <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" />
                  Client Management
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage audit clients, business structures, and importing/exporting.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold cursor-pointer transition-all">
                  <FileSpreadsheet className="w-4 h-4" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportClientsCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Create Client Form */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">Create New Client</h3>
              <form onSubmit={handleCreateClient} className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Enter client name..."
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-xs font-bold px-4">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Client
                </Button>
              </form>
            </div>

            {/* Clients Table */}
            <div className="glass-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
                <span className="text-xs font-bold text-foreground">Client Directory</span>
              </div>
              {clientsLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : clients.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">No clients found. Click Import CSV or add above.</div>
              ) : (
                <div className="divide-y divide-border/50 bg-card">
                  {clients.map((client) => (
                    <div key={client.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                      {editingClientId === client.id ? (
                        <form onSubmit={handleUpdateClient} className="flex-1 flex gap-3 mr-4">
                          <input
                            type="text"
                            required
                            value={editingClientName}
                            onChange={(e) => setEditingClientName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-xs"
                          />
                          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-xs">Save</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingClientId(null)} className="text-xs">Cancel</Button>
                        </form>
                      ) : (
                        <>
                          <div>
                            <span className="text-sm font-bold text-foreground block">{client.name}</span>
                            <span className="text-[10px] text-muted-foreground">{client.sites?.length || 0} sites registered</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingClientId(client.id);
                                setEditingClientName(client.name);
                              }}
                              className="h-8 text-xs"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClient(client.id)}
                              className="h-8 text-xs text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUDITORS VIEW */}
        {view === 'auditors' && (
          <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Auditor Management
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage organization audit personnel, login credentials, and roles.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold cursor-pointer transition-all">
                  <FileSpreadsheet className="w-4 h-4" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportAuditorsCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Create Auditor Form */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">Add New Auditor</h3>
              <form onSubmit={handleCreateAuditor} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Auditor name..."
                  value={newAuditorName}
                  onChange={(e) => setNewAuditorName(e.target.value)}
                  className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input
                  type="email"
                  required
                  placeholder="Email address..."
                  value={newAuditorEmail}
                  onChange={(e) => setNewAuditorEmail(e.target.value)}
                  className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input
                  type="password"
                  required
                  placeholder="Password..."
                  value={newAuditorPassword}
                  onChange={(e) => setNewAuditorPassword(e.target.value)}
                  className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-xs font-bold h-full">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Auditor
                </Button>
              </form>
            </div>

            {/* Auditors Directory Table */}
            <div className="glass-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
                <span className="text-xs font-bold text-foreground">Auditor Registry</span>
              </div>
              {auditorsLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : auditors.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">No auditors registered. Click Import CSV or add above.</div>
              ) : (
                <div className="divide-y divide-border/50 bg-card">
                  {auditors.map((auditor) => (
                    <div key={auditor.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                      {editingAuditorId === auditor.id ? (
                        <form onSubmit={handleUpdateAuditor} className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <input
                            type="text"
                            required
                            value={editingAuditorName}
                            onChange={(e) => setEditingAuditorName(e.target.value)}
                            className="px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-xs"
                          />
                          <input
                            type="email"
                            required
                            value={editingAuditorEmail}
                            onChange={(e) => setEditingAuditorEmail(e.target.value)}
                            className="px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-xs"
                          />
                          <input
                            type="password"
                            placeholder="New password (optional)..."
                            value={editingAuditorPassword}
                            onChange={(e) => setEditingAuditorPassword(e.target.value)}
                            className="px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-xs"
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-xs flex-1">Save</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingAuditorId(null)} className="text-xs">Cancel</Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                              {auditor.name?.charAt(0) || 'A'}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-foreground block">{auditor.name}</span>
                              <span className="text-[10px] text-muted-foreground">{auditor.email} • {auditor.organization?.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAuditorId(auditor.id);
                                setEditingAuditorName(auditor.name || '');
                                setEditingAuditorEmail(auditor.email || '');
                                setEditingAuditorPassword('');
                              }}
                              className="h-8 text-xs"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAuditor(auditor.id)}
                              className="h-8 text-xs text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Build classic checklists with custom sections, tables, signatures, dropdowns, and layouts.
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



      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 px-6 text-center">
        <span className="text-[10px] text-muted-foreground">
          Aura Veritas • Offline-Enabled Compliance Platform • © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
