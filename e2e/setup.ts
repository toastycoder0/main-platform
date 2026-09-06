import { type ChildProcess, spawn } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const PORT = 3001;

let container: StartedPostgreSqlContainer | undefined;
let server: ChildProcess | undefined;

export async function setup() {
  process.env.DOCKER_HOST ??= `unix://${process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 1000}`}/podman/podman.sock`;
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

  const { execSync } = await import('node:child_process');
  execSync('pnpm drizzle-kit push', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  server = spawn('pnpm', ['next', 'dev', '-p', String(PORT)], {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });

  server.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data);
  });

  server.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(data);
  });

  await waitForServer(`http://localhost:${PORT}`, 30_000);
}

export async function teardown() {
  server?.kill('SIGTERM');

  await new Promise((resolve) => setTimeout(resolve, 2_000));

  await container?.stop();
}

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.status < 500) {
        return;
      }
    } catch {
      /* server not ready yet */
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}
