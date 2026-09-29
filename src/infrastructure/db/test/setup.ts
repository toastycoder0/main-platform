import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const DOCKER_HOST = `unix://${process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 1000}`}/podman/podman.sock`;

let container: StartedPostgreSqlContainer | undefined;

export async function setup() {
  process.env.DOCKER_HOST ??= DOCKER_HOST;
  process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';

  process.env.CLOUD_ACCOUNT_ID ??= 'test';
  process.env.CLOUD_SECRET_ACCESS_KEY ??= 'test';
  process.env.CLOUD_ACCESS_KEY_ID ??= 'test';
  process.env.CLOUD_BUCKET ??= 'test';
  process.env.EXCHANGE_TOKEN ??= 'test';
  process.env.CRON_SECRET ??= 'test';
  process.env.BILLING_API_URL ??= 'test';
  process.env.BILLING_USERNAME ??= 'test';
  process.env.BILLING_PASSWORD ??= 'test';
  process.env.BETTER_AUTH_SECRET ??= 'test';
  process.env.ADMIN_SEED_EMAIL ??= 'admin@test.com';
  process.env.ADMIN_SEED_PASSWORD ??= 'password123';
  process.env.NEXT_PUBLIC_CLOUD_URL ??= 'http://test.com';
  process.env.NEXT_PUBLIC_PHONE ??= '123';
  process.env.NEXT_PUBLIC_EMAIL ??= 'test@test.com';
  process.env.NEXT_PUBLIC_CALCULATOR_SOURCE ??= 'test';

  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('platform_test')
    .withUsername('test_user')
    .withPassword('test_password')
    .withTmpFs({ '/var/lib/postgresql/data': '' })
    .withReuse()
    .withStartupTimeout(30_000)
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;

  execSync('pnpm drizzle-kit push', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  await container.exec(['sh', '-c', `pg_dump -d "${url}" --schema-only -f /tmp/schema.dump`]);
}

export async function teardown() {
  await container?.stop();
}

export async function resetDb() {
  if (!container) {
    throw new Error('Container not started');
  }
  const url = container.getConnectionUri();
  await container.exec([
    'sh',
    '-c',
    `psql -d "${url}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && pg_restore -d "${url}" /tmp/schema.dump`,
  ]);
}
