import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';

// GET clients (scoped to organization)
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const url = new URL(req.url);
    // Scoped to organization
    let orgId = user.organizationId;
    
    // Admins can override the orgId via query param
    const queryOrgId = url.searchParams.get('organizationId');
    if (queryOrgId && hasPermission(user, 'manage:masters')) {
      orgId = queryOrgId;
    }

    const clients = await prisma.client.findMany({
      where: { organizationId: orgId },
      include: {
        organization: {
          select: { name: true }
        },
        sites: true
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(clients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST create or bulk import clients
export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'write:checklists')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();

    // Bulk Import
    if (Array.isArray(body)) {
      const created = [];
      for (const item of body) {
        if (item.name) {
          const clientOrgId = item.organizationId || user.organizationId;
          const newClient = await prisma.client.create({
            data: {
              name: item.name,
              organizationId: clientOrgId,
            },
          });
          created.push(newClient);
        }
      }
      return NextResponse.json({ success: true, count: created.length, data: created });
    }

    // Single Create
    const { name, organizationId } = body;
    if (!name) {
      return NextResponse.json({ error: 'Client name is required.' }, { status: 400 });
    }

    const targetOrgId = organizationId || user.organizationId;

    const newClient = await prisma.client.create({
      data: {
        name,
        organizationId: targetOrgId,
      },
    });

    return NextResponse.json(newClient);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT update client
export async function PUT(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'write:checklists')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { id, name, organizationId } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required.' }, { status: 400 });
    }

    // Ensure user has access to this client's organization
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    if (existingClient.organizationId !== user.organizationId && !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name,
        organizationId: organizationId || existingClient.organizationId,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE client
export async function DELETE(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    if (!user || !hasPermission(user, 'write:checklists')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    if (existingClient.organizationId !== user.organizationId && !hasPermission(user, 'manage:masters')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Client deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
