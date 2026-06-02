const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking DB Connection and Data...");
  const orgCount = await prisma.organization.count();
  const userCount = await prisma.user.count();
  const roleCount = await prisma.role.count();
  const clientCount = await prisma.client.count();
  const siteCount = await prisma.site.count();
  const checklistCount = await prisma.checklist.count();

  console.log({
    organizations: orgCount,
    users: userCount,
    roles: roleCount,
    clients: clientCount,
    sites: siteCount,
    checklists: checklistCount
  });

  if (userCount > 0) {
    const users = await prisma.user.findMany({
      include: { role: true, organization: true }
    });
    console.log("Users:", users.map(u => ({ email: u.email, role: u.role.name, org: u.organization.name })));
  }

  if (roleCount > 0) {
    const roles = await prisma.role.findMany({ include: { permissions: true } });
    console.log("Roles & Permissions:", roles.map(r => ({ name: r.name, permissions: r.permissions.map(p => p.action) })));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
