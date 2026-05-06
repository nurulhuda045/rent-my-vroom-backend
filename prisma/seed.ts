import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Role, RegistrationStep } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_PHONE = process.env.ADMIN_PHONE ?? '+917204439929';

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: {
      role: Role.ADMIN,
      phoneVerified: true,
      registrationStep: RegistrationStep.PROFILE_COMPLETED,
      firstName: 'Admin',
      lastName: 'User',
    },
    create: {
      phone: ADMIN_PHONE,
      role: Role.ADMIN,
      phoneVerified: true,
      registrationStep: RegistrationStep.PROFILE_COMPLETED,
      firstName: 'Admin',
      lastName: 'User',
    },
    select: {
      id: true,
      phone: true,
      role: true,
      phoneVerified: true,
      registrationStep: true,
    },
  });

  console.log('Admin user seeded:', adminUser);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
