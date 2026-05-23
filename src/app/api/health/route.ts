import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    // Run a basic raw query to verify communication with PostgreSQL/SQLite
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'connected',
      message: 'Database connection test succeeded.',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    
    return NextResponse.json({
      status: 'failed',
      message: 'Database connection test failed.',
      error: error.message || 'Unknown database error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
