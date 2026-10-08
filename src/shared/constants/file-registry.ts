interface FileTypeConfig {
  path: string;
  maxSize: number;
  allowedTypes: string[];
  maxCount: number;
}

export const FILE_REGISTRY = {
  'tax-document': {
    path: 'users/taxes',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf'],
    maxCount: 1,
  },
} satisfies Record<string, FileTypeConfig>;

export type FileTypeSlug = keyof typeof FILE_REGISTRY;
