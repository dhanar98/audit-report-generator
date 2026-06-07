import slugify from 'slugify';
import { parseDocx } from '@/modules/parser/docxParser';
import { ChecklistSchema, TemplateSectionSchema } from '@/types/schema';
import { ReportComponentSchema, ReportComponentType, ReportSchema } from '@/types/reportSchema';
import { PrismaClient } from '@prisma/client';

export const TEMPLATE_ID = 'tpl_esea_palarivattom_ibe_2026';
export const REPORT_LAYOUT_ID = 'report_esea_palarivattom_ibe_2026';
export const EXPECTED_SECTION_COUNT = 34;

const THEME = { themeColor: '#1B3D72', alignment: 'center' as const };

function stableId(prefix: string, key: string) {
  const slug = slugify(key, { lower: true, strict: true }).slice(0, 48);
  return `${prefix}_${slug || 'item'}`;
}

/** Re-assign deterministic IDs so re-runs stay idempotent and report mappings stay stable. */
export function normalizeEseaSchema(parsed: ChecklistSchema): ChecklistSchema & { id: string } {
  const sections = parsed.sections.map((sec, si) => {
    const secKey = `${si}_${sec.type}_${sec.title}`;
    const normalized: TemplateSectionSchema = {
      ...sec,
      id: stableId('sec', secKey),
      orderIndex: si,
      fields: sec.fields?.map((f, fi) => ({
        ...f,
        id: stableId('field', `${secKey}_${fi}_${f.title}`),
      })),
      tables: sec.tables?.map((t, ti) => ({
        ...t,
        id: stableId('tbl', `${secKey}_${ti}_${t.title}`),
      })),
    };
    return normalized;
  });

  return {
    id: TEMPLATE_ID,
    title: 'IBE ESEA – Electrical Safety & Energy Audit (Palarivattom)',
    description:
      'Indian Bank – Palarivattom Branch Electrical Safety and Energy Audit template (2025-2026). Parsed from the official DOCX report.',
    version: 1,
    sections,
  };
}

function pickReportTypeForRichContent(title: string): ReportComponentType {
  const upper = title.toUpperCase();
  if (upper.includes('EXECUTIVE SUMMARY')) return 'executive_summary';
  if (upper.includes('CONCLUSION')) return 'conclusion';
  if (upper.includes('APPENDIX')) return 'appendix';
  return 'rich_content';
}

function pickReportTypeForTable(tblTitle: string, columns: (string | { header?: string })[]): ReportComponentType {
  const colText = columns
    .map((c) => (typeof c === 'string' ? c : c.header || ''))
    .join(' ');
  const upper = `${tblTitle} ${colText}`.toUpperCase();
  if (upper.includes('PICTURE') || upper.includes('PHOTO')) return 'photo_gallery';
  return 'measurement_table';
}

/** Build one report-layout component (or more) per checklist section/table. */
export function buildReportComponents(sections: TemplateSectionSchema[]): ReportComponentSchema[] {
  const components: ReportComponentSchema[] = [];

  components.push(
    {
      id: 'rc_cover',
      type: 'cover_page',
      title: 'ELECTRICAL SAFETY AND ENERGY AUDIT REPORT',
      subtitle: 'INDIAN BANK – PALARIVATTOM BRANCH (2025-2026)',
      style: THEME,
      layout: { colSpan: 2 },
    },
    {
      id: 'rc_document_info',
      type: 'document_info',
      title: 'Document Details',
      subtitle: 'Prepared by Aura Veritas Engineering and Consultancy Pvt. Ltd.',
      style: { themeColor: '#1B3D72' },
      layout: { colSpan: 2 },
    },
    {
      id: 'rc_page_break_1',
      type: 'page_break',
      title: 'Page Break',
      layout: { colSpan: 2 },
    },
    {
      id: 'rc_toc',
      type: 'table_of_contents',
      title: 'TABLE OF CONTENTS',
      style: { themeColor: '#1B3D72' },
      layout: { colSpan: 2 },
    }
  );

  let kpiAdded = false;

  for (const sec of sections) {
    switch (sec.type) {
      case 'rich_content': {
        components.push({
          id: stableId('rc', `rich_${sec.orderIndex}_${sec.title}`),
          type: pickReportTypeForRichContent(sec.title),
          title: sec.title,
          content: sec.description || '',
          style: { themeColor: '#1B3D72' },
          dataMapping: { sourceComponentId: sec.id },
          layout: { colSpan: 2 },
        });

        if (sec.title.toUpperCase().includes('EXECUTIVE SUMMARY') && !kpiAdded) {
          components.push({
            id: 'rc_kpi_summary',
            type: 'kpi_summary',
            title: 'Compliance Score Summary',
            style: { themeColor: '#1B3D72', accentColor: '#3BB885' },
            layout: { colSpan: 2 },
          });
          kpiAdded = true;
        }
        break;
      }

      case 'table': {
        for (const tbl of sec.tables || []) {
          const reportType = pickReportTypeForTable(tbl.title, tbl.columns || []);
          components.push({
            id: stableId('rc', `table_${sec.orderIndex}_${tbl.id}`),
            type: reportType,
            title: tbl.title || sec.title,
            subtitle: sec.title !== tbl.title ? sec.title : undefined,
            style: { themeColor: '#1B3D72', alignment: reportType === 'photo_gallery' ? 'center' : undefined },
            dataMapping: { sourceComponentId: tbl.id },
            layout: { colSpan: 2 },
          });
        }
        break;
      }

      case 'checklist': {
        components.push({
          id: stableId('rc', `checklist_${sec.orderIndex}_${sec.title}`),
          type: 'observation_matrix',
          title: sec.title,
          subtitle: `${sec.fields?.length || 0} checklist items`,
          style: { themeColor: '#1B3D72' },
          dataMapping: {
            sourceComponentId: sec.id,
            observationFilter: 'ALL',
            includeRemarks: true,
            includeRecommendations: true,
          },
          layout: { colSpan: 2 },
        });
        break;
      }

      case 'observation': {
        components.push({
          id: stableId('rc', `observation_${sec.orderIndex}_${sec.title}`),
          type: 'observation_matrix',
          title: sec.title,
          subtitle: `${sec.fields?.length || 0} inspection points`,
          style: { themeColor: '#1B3D72' },
          dataMapping: {
            sourceComponentId: sec.id,
            observationFilter: 'ALL',
            includeRemarks: true,
          },
          layout: { colSpan: 2 },
        });
        break;
      }

      case 'signature': {
        components.push({
          id: stableId('rc', `signature_${sec.orderIndex}_${sec.title}`),
          type: 'signature_block',
          title: sec.title,
          style: { themeColor: '#1B3D72' },
          dataMapping: { sourceComponentId: sec.id },
          layout: { colSpan: 2 },
        });
        break;
      }

      default:
        break;
    }
  }

  if (!kpiAdded) {
    components.push({
      id: 'rc_kpi_summary',
      type: 'kpi_summary',
      title: 'Compliance Score Summary',
      style: { themeColor: '#1B3D72', accentColor: '#3BB885' },
      layout: { colSpan: 2 },
    });
  }

  components.push({
    id: 'rc_signature_final',
    type: 'signature_block',
    title: 'AUTHORISATION SIGNATURES',
    subtitle: 'Prepared by | Reviewed by | Authorized by',
    style: { themeColor: '#1B3D72' },
    layout: { colSpan: 2 },
  });

  return components;
}

export function buildEseaReportLayout(sections: TemplateSectionSchema[]): ReportSchema {
  return {
    id: REPORT_LAYOUT_ID,
    title: 'IBE ESEA Audit Report – Palarivattom',
    description:
      'Full Electrical Safety & Energy Audit report layout mapped to every parsed DOCX section and table.',
    auditTemplateId: TEMPLATE_ID,
    version: 1,
    components: buildReportComponents(sections),
  };
}

export async function parseAndBuildEsea(fileBuffer: Buffer, fileName: string) {
  const parsed = await parseDocx(fileBuffer, fileName);
  const schema = normalizeEseaSchema(parsed);
  const reportLayout = buildEseaReportLayout(schema.sections);

  const sectionSummary = schema.sections.reduce<Record<string, number>>((acc, sec) => {
    acc[sec.type] = (acc[sec.type] || 0) + 1;
    return acc;
  }, {});

  return {
    schema,
    reportLayout,
    stats: {
      sectionCount: schema.sections.length,
      reportComponentCount: reportLayout.components.length,
      checklistFieldCount: schema.sections
        .filter((s) => s.type === 'checklist')
        .reduce((n, s) => n + (s.fields?.length || 0), 0),
      observationFieldCount: schema.sections
        .filter((s) => s.type === 'observation')
        .reduce((n, s) => n + (s.fields?.length || 0), 0),
      tableCount: schema.sections.reduce((n, s) => n + (s.tables?.length || 0), 0),
      sectionSummary,
    },
  };
}

function prismaSectionCreateData(sections: TemplateSectionSchema[]) {
  return sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    description: sec.description ?? null,
    type: sec.type,
    orderIndex: sec.orderIndex,
    fields: sec.fields?.length
      ? {
          create: sec.fields.map((f, fi) => ({
            id: f.id,
            title: f.title,
            type: f.type,
            required: f.required ?? false,
            riskLevel: f.riskLevel ?? 'LOW',
            recoMapping: f.recoMapping ?? null,
            orderIndex: fi,
          })),
        }
      : undefined,
    tables: sec.tables?.length
      ? {
          create: sec.tables.map((t, ti) => ({
            id: t.id,
            title: t.title,
            columnsJson: JSON.stringify(t.columns),
            rowsJson: JSON.stringify(t.rows),
            orderIndex: ti,
          })),
        }
      : undefined,
  }));
}

export async function persistEseaSetup(
  prisma: PrismaClient,
  schema: ChecklistSchema & { id: string },
  reportLayout: ReportSchema
) {
  const existingTemplate = await prisma.checklist.findUnique({ where: { id: schema.id } });

  if (existingTemplate) {
    await prisma.templateSection.deleteMany({ where: { checklistId: schema.id } });
    await prisma.checklist.update({
      where: { id: schema.id },
      data: {
        title: schema.title,
        description: schema.description,
        version: schema.version,
        status: 'Published',
        sections: { create: prismaSectionCreateData(schema.sections) },
      },
    });
  } else {
    await prisma.checklist.create({
      data: {
        id: schema.id,
        title: schema.title,
        description: schema.description,
        version: schema.version,
        status: 'Published',
        sections: { create: prismaSectionCreateData(schema.sections) },
      },
    });
  }

  const existingReport = await prisma.checklist.findUnique({ where: { id: REPORT_LAYOUT_ID } });
  const reportPayload = { ...reportLayout, isReport: true };

  if (existingReport) {
    await prisma.checklist.update({
      where: { id: REPORT_LAYOUT_ID },
      data: {
        title: reportLayout.title,
        description: reportLayout.description,
        version: 99,
        status: 'Published',
        componentsJson: JSON.stringify(reportPayload),
      },
    });
  } else {
    await prisma.checklist.create({
      data: {
        id: REPORT_LAYOUT_ID,
        title: reportLayout.title,
        description: reportLayout.description,
        version: 99,
        status: 'Published',
        componentsJson: JSON.stringify(reportPayload),
      },
    });
  }
}
