const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const sessionsCount = await prisma.auditSession.count();
    console.log(`Total Audit Sessions in Cloud DB: ${sessionsCount}`);
    
    const checklistsCount = await prisma.checklist.count();
    console.log(`Total Checklists in Cloud DB: ${checklistsCount}`);

    const sessions = await prisma.auditSession.findMany({
      take: 5,
      select: {
        id: true,
        checklistId: true,
        status: true,
        createdAt: true,
        site: { select: { name: true } },
        auditor: { select: { name: true } }
      }
    });

    console.log("Recent Audit Sessions in Cloud DB:");
    console.log(JSON.stringify(sessions, null, 2));

  } catch (error) {
    console.error("Database connection/query error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
