import { NextRequest, NextResponse } from 'next/server';
import { generatePdf } from '@/modules/pdf/pdfGenerator';
import { generateDocx } from '@/modules/docx/docxGenerator';
import { DynamicChecklistSchema, DynamicAuditSession } from '@/types/dynamicSchema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schema, session, format } = body as {
      schema: DynamicChecklistSchema;
      session: DynamicAuditSession;
      format: 'pdf' | 'docx';
    };

    if (!schema || !session) {
      return NextResponse.json({ error: 'Missing schema or session parameters.' }, { status: 400 });
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePdf(schema, session);
      
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=audit_report_${session.id}.pdf`,
          'Content-Length': pdfBuffer.length.toString()
        }
      });
    } else if (format === 'docx') {
      const docxBuffer = await generateDocx(schema, session);
      
      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename=audit_report_${session.id}.docx`,
          'Content-Length': docxBuffer.length.toString()
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Choose pdf or docx.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error generating dynamic report:', error);
    return NextResponse.json({ error: error.message || 'Report compilation failed.' }, { status: 500 });
  }
}
