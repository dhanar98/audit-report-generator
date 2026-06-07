import { openDB, IDBPDatabase } from 'idb';
import { ChecklistSchema, AuditSessionData } from '../../types/schema';

const DB_NAME = 'veriaudit-pwa-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for parsed and published templates
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        // Store for in-progress and cached audit runs
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        // Store for outbound sync queue items
        if (!db.objectStoreNames.contains('sync-queue')) {
          db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export const IndexedDBManager = {
  // --- Templates Store ---
  async saveTemplate(template: ChecklistSchema & { id: string }): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put('templates', template);
  },

  async getTemplates(): Promise<ChecklistSchema[]> {
    const db = await getDB();
    if (!db) return [];
    const all = await db.getAll('templates');
    return all.filter((t: any) => !t.isReport);
  },

  async getTemplate(id: string): Promise<ChecklistSchema | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return db.get('templates', id);
  },

  async deleteTemplate(id: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete('templates', id);
  },

  // --- Sessions Store ---
  async saveSession(session: AuditSessionData): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put('sessions', session);
  },

  async getSessions(): Promise<AuditSessionData[]> {
    const db = await getDB();
    if (!db) return [];
    return db.getAll('sessions');
  },

  async getSession(id: string): Promise<AuditSessionData | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return db.get('sessions', id);
  },

  async deleteSession(id: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete('sessions', id);
  },

  async pruneSessions(keepIds: Set<string>): Promise<void> {
    const db = await getDB();
    if (!db) return;
    const all = await db.getAll('sessions');
    for (const session of all) {
      if (!keepIds.has(session.id)) {
        await db.delete('sessions', session.id);
      }
    }
  },

  // --- Sync Queue Store ---
  async addToSyncQueue(payload: {
    type: 'save_session' | 'publish_template' | 'publish_report_layout' | 'delete_report_layout';
    data: any;
  }): Promise<IDBValidKey | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return db.add('sync-queue', {
      ...payload,
      timestamp: new Date().toISOString()
    });
  },

  async getSyncQueue(): Promise<any[]> {
    const db = await getDB();
    if (!db) return [];
    return db.getAll('sync-queue');
  },

  async removeFromSyncQueue(id: number): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete('sync-queue', id);
  },

  async clearSyncQueue(): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.clear('sync-queue');
  },

  // --- Report Templates Store ---
  async saveReportTemplate(report: any): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put('templates', { ...report, isReport: true });
  },

  async getReportTemplates(): Promise<any[]> {
    const db = await getDB();
    if (!db) return [];
    const all = await db.getAll('templates');
    return all.filter((t: any) => t.isReport === true);
  },

  async getReportTemplate(id: string): Promise<any | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return db.get('templates', id);
  }
};
