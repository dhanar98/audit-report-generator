const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const SALT = 'veriaudit-salt-123456';

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function main() {
  console.log("Resetting passwords for testing...");

  const usersToUpdate = [
    { email: 'admin@example.com', password: 'admin' },
    { email: 'auditor@example.com', password: 'auditor' },
    { email: 'viewer@example.com', password: 'viewer' },
    { email: 'dhanasekaran_ravichandran@example.com', password: 'auditor' },
    { email: 'default_auditor@example.com', password: 'auditor' },
    { email: 'test_auditor@example.com', password: 'auditor' }
  ];

  for (const u of usersToUpdate) {
    const hash = hashPassword(u.password, SALT);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: { passwordHash: hash }
      });
      console.log(`Updated ${u.email} to password: "${u.password}"`);
    } else {
      console.log(`User ${u.email} not found.`);
    }
  }

  console.log("Done resetting passwords.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
