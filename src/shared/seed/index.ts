import { eq } from 'drizzle-orm';
import { env } from '@/config/env';
import { auth } from '@/shared/auth';
import { db } from '@/shared/db';
import { user } from '@/shared/db/schema';
import { logger } from '@/shared/logger';

async function seed(): Promise<void> {
  const { ADMIN_SEED_EMAIL: email, ADMIN_SEED_PASSWORD: password } = env;

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  const existingUser = existing.at(0);

  if (existingUser) {
    logger.info(
      { email, userId: existingUser.id },
      'Admin user already exists — skipping creation',
    );
    return;
  }

  await auth.api.createUser({
    body: {
      email,
      password,
      name: 'John',
      data: {
        lastName: 'Doe',
      },
      role: 'admin',
    },
  });

  logger.info({ email }, 'Admin user created successfully');
}

async function main() {
  try {
    await seed();
    process.exitCode = 0;
  } catch (error) {
    logger.error({ err: error }, 'Seeding failed');
    process.exitCode = 1;
  } finally {
    await db.$client.end();
    process.exit();
  }
}

main();
