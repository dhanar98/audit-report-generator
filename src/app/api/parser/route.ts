import { NextRequest, NextResponse } from 'next/server';
import { parseDocx } from '../../../modules/parser/docxParser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded in the request form data.' },
        { status: 400 }
      );
    }
    
    // Check file extension
    const fileName = file.name;
    if (!fileName.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Invalid file format. Only Microsoft Word (.docx) files are supported.' },
        { status: 400 }
      );
    }
    
    // Read arrayBuffer from File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Run parser
    const checklistSchema = await parseDocx(buffer, fileName);
    
    return NextResponse.json(checklistSchema);
  } catch (error: any) {
    console.error('Error parsing DOCX file:', error);
    return NextResponse.json(
      { error: `Parsing failed: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
