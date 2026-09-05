import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const DOCKER_HOST = `unix://${process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 1000}`}/podman/podman.sock`;

let container: StartedPostgreSqlContainer | undefined;

export async function setup() {
  process.env.DOCKER_HOST ??= DOCKER_HOST;
  process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';

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
