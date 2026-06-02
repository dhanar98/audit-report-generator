const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function main() {
  try {
    console.log("Seeding database...");

    // 1. Create Default Organization
    const org = await prisma.organization.upsert({
      where: { id: 'c8fd95c9-55b4-4735-9b4f-248eaba6d064' },
      update: { name: 'VeriAudit Enterprise' },
      create: {
        id: 'c8fd95c9-55b4-4735-9b4f-248eaba6d064',
        name: 'VeriAudit Enterprise'
      }
    });
    console.log("Organization seeded:", org.name);

    // 2. Create Permissions
    const permissionsList = [
      { action: 'manage:all' },
      { action: 'read:checklists' },
      { action: 'write:checklists' },
      { action: 'read:sessions' },
      { action: 'write:sessions' },
      { action: 'manage:masters' }
    ];

    const permissions = {};
    for (const p of permissionsList) {
      const dbPermission = await prisma.permission.create({
        data: p
      });
      permissions[p.action] = dbPermission;
    }
    console.log("Permissions seeded.");

    // 3. Create Roles with Permissions
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {
        permissions: {
          set: Object.values(permissions).map(p => ({ id: p.id }))
        }
      },
      create: {
        name: 'ADMIN',
        permissions: {
          connect: Object.values(permissions).map(p => ({ id: p.id }))
        }
      }
    });

    const auditorRole = await prisma.role.upsert({
      where: { name: 'AUDITOR' },
      update: {
        permissions: {
          set: [
            { id: permissions['read:checklists'].id },
            { id: permissions['write:checklists'].id },
            { id: permissions['read:sessions'].id },
            { id: permissions['write:sessions'].id }
          ]
        }
      },
      create: {
        name: 'AUDITOR',
        permissions: {
          connect: [
            { id: permissions['read:checklists'].id },
            { id: permissions['write:checklists'].id },
            { id: permissions['read:sessions'].id },
            { id: permissions['write:sessions'].id }
          ]
        }
      }
    });

    const viewerRole = await prisma.role.upsert({
      where: { name: 'VIEWER' },
      update: {
        permissions: {
          set: [
            { id: permissions['read:checklists'].id },
            { id: permissions['read:sessions'].id }
          ]
        }
      },
      create: {
        name: 'VIEWER',
        permissions: {
          connect: [
            { id: permissions['read:checklists'].id },
            { id: permissions['read:sessions'].id }
          ]
        }
      }
    });
    console.log("Roles seeded.");

    // 4. Create Users
    const salt = 'veriaudit-salt-123456';

    const usersToCreate = [
      {
        email: 'admin@example.com',
        name: 'Super Admin',
        passwordHash: hashPassword('AdminPassword123', salt),
        roleId: adminRole.id,
        organizationId: org.id
      },
      {
        email: 'auditor@example.com',
        name: 'Lead Auditor',
        passwordHash: hashPassword('AuditorPassword123', salt),
        roleId: auditorRole.id,
        organizationId: org.id
      },
      {
        email: 'viewer@example.com',
        name: 'Executive Viewer',
        passwordHash: hashPassword('ViewerPassword123', salt),
        roleId: viewerRole.id,
        organizationId: org.id
      }
    ];

    for (const u of usersToCreate) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          passwordHash: u.passwordHash,
          roleId: u.roleId,
          organizationId: u.organizationId
        },
        create: u
      });
    }

    // Also update existing user "dhanasekaran_ravichandran@example.com" to have a valid hashed password and role
    await prisma.user.upsert({
      where: { email: 'dhanasekaran_ravichandran@example.com' },
      update: {
        passwordHash: hashPassword('DhanaPassword123', salt),
        roleId: auditorRole.id,
        organizationId: org.id
      },
      create: {
        email: 'dhanasekaran_ravichandran@example.com',
        name: 'Dhanasekaran Ravichandran',
        passwordHash: hashPassword('DhanaPassword123', salt),
        roleId: auditorRole.id,
        organizationId: org.id
      }
    });

    console.log("Users seeded successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
