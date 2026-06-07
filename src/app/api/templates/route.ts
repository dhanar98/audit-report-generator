import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/templates
 * Returns all published audit templates stored in PostgreSQL, formatted
 * as ChecklistSchema-compatible objects so the client can merge them into
 * IndexedDB on startup.  This enables the setup script to seed templates
 * server-side and have every client pick them up automatically.
 */
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checklists = await prisma.checklist.findMany({
      where: { status: 'Published', version: { not: 99 } }, // exclude report-schema sentinels
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            fields: { orderBy: { orderIndex: 'asc' } },
            tables: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const templates = checklists.map((c) => {
      // v2 dynamic schema stored as raw JSON
      if (c.version === 2 && c.componentsJson) {
        try {
          const parsed = JSON.parse(c.componentsJson);
          return { id: c.id, ...parsed };
        } catch {
          return null;
        }
      }

      // v1 normalised sections → ChecklistSchema
      return {
        id: c.id,
        title: c.title,
        description: c.description ?? '',
        version: c.version,
        sections: c.sections.map((sec) => ({
          id: sec.id,
          title: sec.title,
          type: sec.type,
          orderIndex: sec.orderIndex,
          description: sec.description ?? undefined,
          fields: sec.fields.map((f) => ({
            id: f.id,
            title: f.title,
            type: f.type,
            required: f.required,
            riskLevel: f.riskLevel,
            recoMapping: f.recoMapping ?? undefined,
            orderIndex: f.orderIndex,
          })),
          tables: sec.tables.map((t) => ({
            id: t.id,
            title: t.title,
            columns: JSON.parse(t.columnsJson),
            rows: JSON.parse(t.rowsJson),
            orderIndex: t.orderIndex,
          })),
        })),
      };
    }).filter(Boolean);

    // Also fetch report-schema sentinels (version === 99)
    const reportSchemas = await prisma.checklist.findMany({
      where: { status: 'Published', version: 99 },
    });

    const reportLayouts = reportSchemas.map((rs) => {
      try {
        const parsed = JSON.parse(rs.componentsJson ?? '{}');
        return { ...parsed, isReport: true };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json([...templates, ...reportLayouts]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load templates' }, { status: 500 });
  }
}
