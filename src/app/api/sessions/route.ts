import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { mapDbSessionToClient } from '@/lib/sessionMapper';

/**
 * GET /api/sessions
 * Returns audit sessions for the logged-in user.
 * ADMIN users receive all sessions within their organization.
 */
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const isAdmin = user.role === 'ADMIN';

    const sessions = await prisma.auditSession.findMany({
      where: isAdmin
        ? { site: { client: { organizationId: user.organizationId } } }
        : { auditorId: user.userId },
      include: {
        site: { include: { client: true } },
        auditor: { select: { id: true, name: true, email: true } },
        responses: true,
        photos: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json(sessions.map(mapDbSessionToClient));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
