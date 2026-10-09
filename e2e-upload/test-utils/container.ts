import { type ChildProcess, spawn } from 'node:child_process';
import { CreateBucketCommand, PutBucketPolicyCommand, S3Client } from '@aws-sdk/client-s3';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

const SERVER_PORT = 3002;
const BUCKET = 'uploads';
const MINIO_USER = 'minioadmin';
const MINIO_PASSWORD = 'minioadmin';

class UploadE2EContainer {
  private _db: StartedPostgreSqlContainer | undefined;
  private _minio: StartedTestContainer | undefined;
  private _server: ChildProcess | undefined;

  async start() {
    process.env.DOCKER_HOST ??= `unix://${process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 1000}`}/podman/podman.sock`;
    process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';

    this._db = await new PostgreSqlContainer('postgres:17')
      .withDatabase('platform_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .withTmpFs({ '/var/lib/postgresql/data': '' })
      .withReuse()
      .withStartupTimeout(30_000)
      .start();

    const dbUrl = this._db.getConnectionUri();
    process.env.DATABASE_URL = dbUrl;

    this._minio = await new GenericContainer('docker.io/pgsty/minio:latest')
      .withCommand(['server', '/data'])
      .withEnvironment({
        MINIO_ROOT_USER: MINIO_USER,
        MINIO_ROOT_PASSWORD: MINIO_PASSWORD,
        // Match the region the S3 client signs with.
        MINIO_REGION: 'auto',
      })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000).forStatusCode(200))
      .withStartupTimeout(60_000)
      .start();

    const endpoint = `http://${this._minio.getHost()}:${this._minio.getMappedPort(9000)}`;

    await prepareBucket(endpoint);

    const { execSync } = await import('node:child_process');
    execSync('pnpm drizzle-kit push', {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });

    this._server = spawn('pnpm', ['next', 'dev', '-p', String(SERVER_PORT)], {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        CLOUD_ENDPOINT: endpoint,
        CLOUD_ACCOUNT_ID: 'test',
        CLOUD_ACCESS_KEY_ID: MINIO_USER,
        CLOUD_SECRET_ACCESS_KEY: MINIO_PASSWORD,
        CLOUD_BUCKET: BUCKET,
        NEXT_PUBLIC_CLOUD_URL: `${endpoint}/${BUCKET}`,
      },
    });

    this._server.stderr?.on('data', (data: Buffer) => process.stderr.write(data));
    this._server.stdout?.on('data', (data: Buffer) => process.stdout.write(data));

    await waitForServer(`http://localhost:${SERVER_PORT}`, 60_000);
  }

  async stop() {
    this._server?.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await this._minio?.stop();
    await this._db?.stop();
  }
}

async function prepareBucket(endpoint: string): Promise<void> {
  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId: MINIO_USER, secretAccessKey: MINIO_PASSWORD },
    forcePathStyle: true,
  });

  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));

  // Public read so the app's `NEXT_PUBLIC_CLOUD_URL/<key>` links resolve.
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          },
        ],
      }),
    }),
  );
}

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const ok = await fetch(url)
      .then((res) => res.status < 500)
      .catch(() => false);
    if (ok) {
      return;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}

export const uploadE2e = new UploadE2EContainer();
