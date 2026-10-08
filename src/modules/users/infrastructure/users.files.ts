import { storageClient } from '@/infrastructure/storage/client';
import { isTempKey } from '@/infrastructure/storage/keys';
import type { TaxProfileSchema } from '../application/users.validation';

export async function resolveTaxProfileFiles(
  userId: string,
  taxProfiles: TaxProfileSchema[],
): Promise<void> {
  for (const profile of taxProfiles) {
    if (isTempKey(profile.rfcUrl)) {
      const suffix = profile.rfcUrl.replace('_temp/', '');
      const finalKey = `users/taxes/${userId}/${suffix}`;

      await storageClient.copyFile(profile.rfcUrl, finalKey);
      await storageClient.deleteFile(profile.rfcUrl);

      profile.rfcUrl = storageClient.getPublicUrl(finalKey);
    }
  }
}
