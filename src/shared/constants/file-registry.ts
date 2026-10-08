export type FileOwnerType =
  | 'product'
  | 'product_variant'
  | 'brand'
  | 'category'
  | 'order'
  | 'shipment'
  | 'user';

export interface ScopeConfig {
  path: string;
  ownerType: FileOwnerType;
  allowedTypes: string[];
  maxSize: number;
  maxCount: number;
}

const MB = 1024 * 1024;
const DOCUMENT_TYPES = ['application/pdf'];

// A scope is an independent collection inside an entity. File ownership is the
// (entity, scope, ownerId) locator, and `ownerType` disambiguates what
// `ownerId` refers to for that scope.
export const FILE_REGISTRY = {
  user: {
    taxDocument: {
      path: 'users/taxes',
      ownerType: 'user',
      allowedTypes: DOCUMENT_TYPES,
      maxSize: 10 * MB,
      maxCount: 10,
    },
  },
} satisfies Record<string, Record<string, ScopeConfig>>;

export type FileEntity = keyof typeof FILE_REGISTRY;
export type FileScope<E extends FileEntity> = keyof (typeof FILE_REGISTRY)[E];

export function getScopeConfig(entity: string, scope: string): ScopeConfig | undefined {
  const entityConfig = (FILE_REGISTRY as Record<string, Record<string, ScopeConfig>>)[entity];
  return entityConfig?.[scope];
}
