import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { DynamicRenderer } from './DynamicRenderer';
import { COMPREHENSIVE_DYNAMIC_SCHEMA } from '@/utils/dynamicAuditMock';
import { DynamicChecklistSchema, DynamicAuditSession } from '@/types/dynamicSchema';
import { IndexedDBManager } from '@/modules/offline/IndexedDBManager';

interface DynamicRunnerViewProps {
  schema: DynamicChecklistSchema;
  initialSession?: DynamicAuditSession | null;
  onBack: () => void;
}

const syncChannel = typeof window !== 'undefined' ? new BroadcastChannel('veriaudit-sync-channel') : null;

export function DynamicRunnerView({ schema, initialSession, onBack }: DynamicRunnerViewProps) {
  const effectiveSchema = (schema && schema.components) ? schema : COMPREHENSIVE_DYNAMIC_SCHEMA;
  const [session, setSession] = useState<DynamicAuditSession | null>(null);

  // Cross-tab synchronization
  useEffect(() => {
    if (!syncChannel) return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'SESSIONS_UPDATED') {
        const stored = await IndexedDBManager.getSession(session?.id || 'active_dynamic_session');
        if (stored && (stored as any).schemaId === effectiveSchema.id) {
          setSession(stored as any);
        }
      }
    };

    syncChannel.addEventListener('message', handleMessage);
    return () => {
      syncChannel.removeEventListener('message', handleMessage);
    };
  }, [effectiveSchema.id, session?.id]);

  // Initialize session response data structure from IndexedDB
  useEffect(() => {
    const initSession = async () => {
      if (initialSession) {
        setSession(initialSession);
        return;
      }

      const stored = await IndexedDBManager.getSession('active_dynamic_session');
      if (stored && (stored as any).schemaId === effectiveSchema.id) {
        setSession(stored as any);
      } else {
        const newSession: DynamicAuditSession = {
          id: 'active_dynamic_session',
          schemaId: effectiveSchema.id,
          clientName: '',
          siteName: '',
          siteAddress: '',
          auditorName: '',
          status: 'In_Progress',
          startedAt: new Date().toISOString(),
          responses: []
        };
        setSession(newSession);
      }
    };
    initSession();
  }, [effectiveSchema.id, initialSession]);

  const handleSave = async (updatedSession: DynamicAuditSession, silent?: boolean) => {
    try {
      setSession(updatedSession);
      await IndexedDBManager.saveSession(updatedSession as any);
      // Queue offline sync
      await IndexedDBManager.addToSyncQueue({
        type: 'save_session',
        data: updatedSession
      });
      syncChannel?.postMessage({ type: 'SESSIONS_UPDATED' });
      if (!silent) {
        alert('Audit session draft successfully saved offline!');
      }
    } catch (e: any) {
      if (!silent) {
        alert(`Save failed: ${e.message}`);
      }
    }
  };

  const handleComplete = async (completedSession: DynamicAuditSession) => {
    try {
      const updated = {
        ...completedSession,
        status: 'Completed' as const,
        completedAt: new Date().toISOString()
      };
      setSession(updated);
      await IndexedDBManager.saveSession(updated as any);
      // Queue offline sync
      await IndexedDBManager.addToSyncQueue({
        type: 'save_session',
        data: updated
      });
      syncChannel?.postMessage({ type: 'SESSIONS_UPDATED' });
      alert('Audit successfully completed!');
    } catch (e: any) {
      alert(`Completion failed: ${e.message}`);
    }
  };

  const handleExportPdf = async (exportSession: DynamicAuditSession) => {
    try {
      const res = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: effectiveSchema, session: exportSession, format: 'pdf' })
      });

      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Report_${effectiveSchema.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`PDF generation failed: ${e.message}`);
    }
  };

  const handleExportDocx = async (exportSession: DynamicAuditSession) => {
    try {
      const res = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: effectiveSchema, session: exportSession, format: 'docx' })
      });

      if (!res.ok) throw new Error('Failed to generate Word document');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Report_${effectiveSchema.title.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Word export failed: ${e.message}`);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Loading Dynamic Audit Session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DynamicRenderer 
        schema={effectiveSchema}
        initialSession={session}
        onSave={handleSave}
        onComplete={handleComplete}
        onBack={onBack}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
        readOnly={false}
      />
    </div>
  );
}
