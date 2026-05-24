const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const sessions = await prisma.auditSession.findMany({
      include: {
        site: true,
        checklist: true
      }
    });
    console.log("All Database Audit Sessions:");
    console.log(JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
