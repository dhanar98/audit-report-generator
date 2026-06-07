import { AuditSessionData } from '@/types/schema';

/** Map a Prisma audit session (with relations) to client-side AuditSessionData. */
export function mapDbSessionToClient(session: any): AuditSessionData {
  const responses =
    session.responses?.map((r: any) => ({
      fieldId: r.fieldId,
      value: r.value || '',
      remarks: r.remarks || undefined,
      recommendation: r.recommendation || undefined,
      status: r.status || undefined,
    })) || [];

  const photos =
    session.photos?.map((p: any) => ({
      id: p.id,
      fileName: p.fileName,
      mimeType: p.mimeType,
      base64Data: p.base64Data,
      caption: p.caption || undefined,
    })) || [];

  return {
    id: session.id,
    checklistId: session.checklistId,
    siteId: session.siteId,
    siteName: session.site?.name || 'Unknown Site',
    clientName: session.site?.client?.name || 'Unknown Client',
    auditorId: session.auditorId,
    auditorName: session.auditor?.name || session.auditor?.email || 'Unknown Auditor',
    status: session.status as AuditSessionData['status'],
    startedAt: session.startedAt?.toISOString?.() || session.startedAt,
    completedAt: session.completedAt?.toISOString?.() || session.completedAt || undefined,
    responses,
    photos,
  };
}
