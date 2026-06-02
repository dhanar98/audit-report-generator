const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: {
          include: {
            permissions: true
          }
        },
        organization: true
      }
    });
    console.log("Users in Database:", JSON.stringify(users, null, 2));

    const roles = await prisma.role.findMany({
      include: {
        permissions: true
      }
    });
    console.log("Roles in Database:", JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
