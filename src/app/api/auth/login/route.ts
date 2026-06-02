import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/crypto';

const SALT = 'veriaudit-salt-123456';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
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
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const expectedHash = hashPassword(password, SALT);
    if (user.passwordHash !== expectedHash) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Generate stateless token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: user.role.permissions.map((p) => p.action),
      organizationId: user.organizationId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.action),
        organization: user.organization,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('veriaudit_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
