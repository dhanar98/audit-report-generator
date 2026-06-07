import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  EXPECTED_SECTION_COUNT,
  REPORT_LAYOUT_ID,
  TEMPLATE_ID,
  parseAndBuildEsea,
  persistEseaSetup,
} from '@/modules/setup/eseaSetup';

const DOCX_PATH = path.join(process.cwd(), 'Palarivattom Branch - IBE ESEA Report (Copy).docx');

/**
 * POST /api/setup/esea
 * Parses the Palarivattom IBE ESEA DOCX using the full docxParser pipeline,
 * seeds ALL sections/components into PostgreSQL, and builds a report layout
 * with one report component per section/table. Idempotent — safe to re-run.
 */
export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'AUDITOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!fs.existsSync(DOCX_PATH)) {
      return NextResponse.json(
        { error: `DOCX not found at ${DOCX_PATH}. Place the file in the project root.` },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(DOCX_PATH);
    const { schema, reportLayout, stats } = await parseAndBuildEsea(
      fileBuffer,
      'Palarivattom Branch - IBE ESEA Report (Copy).docx'
    );

    await persistEseaSetup(prisma, schema, reportLayout);

    return NextResponse.json({
      success: true,
      templateId: TEMPLATE_ID,
      reportLayoutId: REPORT_LAYOUT_ID,
      message: 'ESEA template and report layout seeded successfully with all parsed sections.',
      stats: {
        ...stats,
        expectedSectionCount: EXPECTED_SECTION_COUNT,
        sectionsComplete: stats.sectionCount >= EXPECTED_SECTION_COUNT,
      },
      sections: schema.sections.map((s) => ({
        orderIndex: s.orderIndex,
        type: s.type,
        title: s.title,
        fieldCount: s.fields?.length || 0,
        tableCount: s.tables?.length || 0,
      })),
      reportComponents: reportLayout.components.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        sourceComponentId: c.dataMapping?.sourceComponentId,
      })),
    });
  } catch (error: any) {
    console.error('[/api/setup/esea]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
