import { NextRequest, NextResponse } from 'next/server';
import { generateCustomPdf } from '@/modules/pdf/customReportRenderer';
import { generateCustomDocx } from '@/modules/docx/customReportDocxRenderer';
import { ReportSchema } from '@/types/reportSchema';
import { DynamicAuditSession, DynamicChecklistSchema } from '@/types/dynamicSchema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportSchema, session, checklistSchema, format } = body as {
      reportSchema: ReportSchema;
      session: DynamicAuditSession;
      checklistSchema: DynamicChecklistSchema;
      format: 'pdf' | 'docx';
    };

    if (!reportSchema || !session || !checklistSchema) {
      return NextResponse.json(
        { error: 'Missing reportSchema, checklistSchema, or session parameters.' },
        { status: 400 }
      );
    }

    if (format === 'pdf') {
      const pdfBuffer = await generateCustomPdf(reportSchema, session, checklistSchema);
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=custom_report_${session.id}.pdf`,
          'Content-Length': pdfBuffer.length.toString()
        }
      });
    } else if (format === 'docx') {
      const docxBuffer = await generateCustomDocx(reportSchema, session, checklistSchema);
      
      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename=custom_report_${session.id}.docx`,
          'Content-Length': docxBuffer.length.toString()
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Choose pdf or docx.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error generating custom report:', error);
    return NextResponse.json(
      { error: error.message || 'Custom report generation failed.' },
      { status: 500 }
    );
  }
}
