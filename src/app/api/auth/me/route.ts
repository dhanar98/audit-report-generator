import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userPayload = getCurrentUser(req);
    if (!userPayload) {
      return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Optionally fetch fresh user details from the database
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        organization: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.action),
        organizationId: user.organizationId,
        organization: user.organization,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
