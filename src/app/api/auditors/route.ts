import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { hashPassword } from '@/lib/crypto';

const SALT = 'veriaudit-salt-123456';

// GET auditors in the user's organization
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const url = new URL(req.url);
    let orgId = user.organizationId;
    
    // Admins can override the orgId query parameter
    const queryOrgId = url.searchParams.get('organizationId');
    if (queryOrgId && hasPermission(user, 'manage:masters')) {
      orgId = queryOrgId;
    }

    const auditors = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: {
          name: 'AUDITOR'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        roleId: true,
        createdAt: true,
        role: {
          select: { name: true }
        },
        organization: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(auditors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST create or bulk import auditors
export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized. Requires Admin/Manager rights.' }, { status: 403 });
    }

    const auditorRole = await prisma.role.findUnique({
      where: { name: 'AUDITOR' }
    });

    if (!auditorRole) {
      return NextResponse.json({ error: 'AUDITOR role not found in database.' }, { status: 500 });
    }

    const body = await req.json();

    // Bulk Import
    if (Array.isArray(body)) {
      const created = [];
      for (const item of body) {
        if (item.email && item.name) {
          const clientOrgId = item.organizationId || user.organizationId;
          const password = item.password || 'Welcome@123'; // Default temp password
          const passwordHash = hashPassword(password, SALT);

          // Check if email already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: item.email }
          });

          if (!existingUser) {
            const newAuditor = await prisma.user.create({
              data: {
                email: item.email,
                name: item.name,
                passwordHash,
                organizationId: clientOrgId,
                roleId: auditorRole.id,
              },
              select: {
                id: true,
                email: true,
                name: true,
                organizationId: true,
                roleId: true
              }
            });
            created.push(newAuditor);
          }
        }
      }
      return NextResponse.json({ success: true, count: created.length, data: created });
    }

    // Single Create
    const { name, email, password, organizationId } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
    }

    const targetOrgId = organizationId || user.organizationId;
    const passwordHash = hashPassword(password, SALT);

    const newAuditor = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        organizationId: targetOrgId,
        roleId: auditorRole.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        roleId: true
      }
    });

    return NextResponse.json(newAuditor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT update auditor
export async function PUT(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { id, name, email, password, organizationId } = await req.json();
    if (!id || !name || !email) {
      return NextResponse.json({ error: 'ID, name, and email are required.' }, { status: 400 });
    }

    // Ensure auditor belongs to user's organization
    const existingAuditor = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!existingAuditor || existingAuditor.role.name !== 'AUDITOR') {
      return NextResponse.json({ error: 'Auditor not found.' }, { status: 404 });
    }

    if (existingAuditor.organizationId !== user.organizationId && !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const updateData: any = {
      name,
      email,
      organizationId: organizationId || existingAuditor.organizationId,
    };

    if (password && password.trim() !== '') {
      updateData.passwordHash = hashPassword(password, SALT);
    }

    const updatedAuditor = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true
      }
    });

    return NextResponse.json(updatedAuditor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE auditor
export async function DELETE(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Auditor ID is required.' }, { status: 400 });
    }

    const existingAuditor = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!existingAuditor || existingAuditor.role.name !== 'AUDITOR') {
      return NextResponse.json({ error: 'Auditor not found.' }, { status: 404 });
    }

    if (existingAuditor.organizationId !== user.organizationId && !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Auditor deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
