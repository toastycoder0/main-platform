import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';

export interface StorageClient {
  getPresignedUploadUrl(key: string, contentType: string): Promise<string>;
  fileExists(key: string): Promise<boolean>;
  copyFile(sourceKey: string, destKey: string): Promise<void>;
  deleteFile(key: string): Promise<void>;
  deleteFiles(keys: string[]): Promise<void>;
  getPublicUrl(key: string): string;
}

export function createStorageClient(): StorageClient {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: env.CLOUD_ENDPOINT ?? `https://${env.CLOUD_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.CLOUD_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUD_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  return {
    getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
      const command = new PutObjectCommand({
        Bucket: env.CLOUD_BUCKET,
        Key: key,
        ContentType: contentType,
      });
      return getSignedUrl(s3, command, { expiresIn: 300 });
    },

    async fileExists(key: string): Promise<boolean> {
      try {
        const command = new HeadObjectCommand({ Bucket: env.CLOUD_BUCKET, Key: key });
        await s3.send(command);
        return true;
      } catch {
        return false;
      }
    },

    async copyFile(sourceKey: string, destKey: string): Promise<void> {
      const command = new CopyObjectCommand({
        Bucket: env.CLOUD_BUCKET,
        Key: destKey,
        CopySource: `${env.CLOUD_BUCKET}/${sourceKey}`,
      });
      await s3.send(command);
    },

    async deleteFile(key: string): Promise<void> {
      const command = new DeleteObjectCommand({ Bucket: env.CLOUD_BUCKET, Key: key });
      await s3.send(command);
    },

    async deleteFiles(keys: string[]): Promise<void> {
      // R2 caps a single DeleteObjects request at 1000 keys.
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000).map((Key) => ({ Key }));
        const command = new DeleteObjectsCommand({
          Bucket: env.CLOUD_BUCKET,
          Delete: { Objects: batch },
        });
        await s3.send(command);
      }
    },

    getPublicUrl(key: string): string {
      return `${env.NEXT_PUBLIC_CLOUD_URL}/${key}`;
    },
  };
}

export const storageClient = createStorageClient();
