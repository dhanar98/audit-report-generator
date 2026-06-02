import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';

// GET all organizations
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized. Requires Admin role.' }, { status: 403 });
    }

    const orgs = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(orgs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST create or bulk import organizations
export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized. Requires Admin role.' }, { status: 403 });
    }

    const body = await req.json();

    if (Array.isArray(body)) {
      const created = [];
      for (const org of body) {
        if (org.name) {
          const newOrg = await prisma.organization.create({
            data: { name: org.name },
          });
          created.push(newOrg);
        }
      }
      return NextResponse.json({ success: true, count: created.length, data: created });
    }

    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 });
    }

    const newOrg = await prisma.organization.create({
      data: { name },
    });

    return NextResponse.json(newOrg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT / DELETE need dynamic ID. Next.js App Router uses dynamic routing folders or params.
// For simplicity, we can also handle id in query/body, or use dynamic routing.
// Let's support both or handle via query parameter `id` to avoid creating multiple folders.
// Let's read `id` from URL query parameter or request body.
export async function PUT(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized. Requires Admin role.' }, { status: 403 });
    }

    const { id, name } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required.' }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(updatedOrg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Unauthorized. Requires Admin role.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required.' }, { status: 400 });
    }

    // Delete organization (Cascade will delete users and clients associated)
    await prisma.organization.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Organization deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
