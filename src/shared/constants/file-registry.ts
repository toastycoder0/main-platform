export type FileOwnerType =
  | 'product_document'
  | 'product_image'
  | 'brand'
  | 'category'
  | 'user'
  | 'order';

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
  order: {
    invoiceRfc: {
      path: 'orders/rfc/invoice',
      ownerType: 'order',
      allowedTypes: DOCUMENT_TYPES,
      maxSize: 10 * MB,
      maxCount: 1,
    },
    senderRfc: {
      path: 'orders/rfc/sender',
      ownerType: 'order',
      allowedTypes: DOCUMENT_TYPES,
      maxSize: 10 * MB,
      maxCount: 1,
    },
    receiverRfc: {
      path: 'orders/rfc/receiver',
      ownerType: 'order',
      allowedTypes: DOCUMENT_TYPES,
      maxSize: 10 * MB,
      maxCount: 1,
    },
  },
  category: {
    image: {
      path: 'categories/images',
      ownerType: 'category',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: 5 * MB,
      maxCount: 1,
    },
  },
  brand: {
    image: {
      path: 'brands/images',
      ownerType: 'brand',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: 5 * MB,
      maxCount: 1,
    },
  },
  product_documents: {
    document: {
      path: 'products/documents',
      ownerType: 'product_document',
      allowedTypes: DOCUMENT_TYPES,
      maxSize: 10 * MB,
      maxCount: 20,
    },
  },
  product_images: {
    image: {
      path: 'products/images',
      ownerType: 'product_image',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: 5 * MB,
      // Product galleries are intentionally unbounded.
      maxCount: Number.POSITIVE_INFINITY,
    },
  },
} satisfies Record<string, Record<string, ScopeConfig>>;

export type FileEntity = keyof typeof FILE_REGISTRY;
export type FileScope<E extends FileEntity> = keyof (typeof FILE_REGISTRY)[E];

export function getScopeConfig(entity: string, scope: string): ScopeConfig | undefined {
  const entityConfig = (FILE_REGISTRY as Record<string, Record<string, ScopeConfig>>)[entity];
  return entityConfig?.[scope];
}
