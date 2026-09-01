import { env } from '@/config/env';
import { auth } from '@/shared/auth';

async function seed() {
  const { ADMIN_SEED_EMAIL: email, ADMIN_SEED_PASSWORD: password } = env;

  const newUser = await auth.api.createUser({
    body: {
      email,
      password,
      role: 'admin',
      name: 'John',
      data: {
        lastName: 'Doe',
      },
    },
  });
}

await seed();
