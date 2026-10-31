import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

/**
 * Idempotent seed: creates the three roles the app depends on, and (optionally)
 * the first administrator when SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are set.
 *   npm run db:seed
 */
const url = new URL(process.env.DATABASE_URL!);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 2,
    allowPublicKeyRetrieval: true,
  }),
});

async function main() {
  const roles = {
    ADMIN: 'Platform administrator',
    EMPLOYER: 'Company / recruiter account',
    JOB_SEEKER: 'Candidate account',
  };

  for (const [name, description] of Object.entries(roles)) {
    await prisma.roles.upsert({
      where: { name },
      update: {},
      create: { id: randomUUID(), name, description },
    });
  }
  console.log('Roles ready:', Object.keys(roles).join(', '));

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: skipping admin user.');
    return;
  }

  const adminRole = await prisma.roles.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists.`);
    return;
  }

  await prisma.users.create({
    data: {
      id: randomUUID(),
      role_id: adminRole.id,
      first_name: process.env.SEED_ADMIN_FIRST_NAME ?? 'System',
      last_name: process.env.SEED_ADMIN_LAST_NAME ?? 'Admin',
      email,
      phone_number: process.env.SEED_ADMIN_PHONE ?? '+254000000000',
      password_hash: await bcrypt.hash(password, 12),
      email_verified: true,
      account_status: 'ACTIVE',
    },
  });
  console.log(`Admin ${email} created.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
