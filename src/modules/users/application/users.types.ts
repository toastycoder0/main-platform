export type PermissionEffect = 'allow' | 'deny';

export interface RoleOptionDTO {
  id: string;
  slug: string;
  name: string;
}

export interface PermissionOverrideDTO {
  permissionId: string;
  effect: PermissionEffect;
  expiresAt: Date | null;
}

export interface UserAddressDTO {
  id: string;
  name: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  colony: string;
  municipality: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

export interface UserTaxProfileDTO {
  id: string;
  alias: string;
  legalName: string;
  rfc: string;
  cfdiUse: string;
  taxRegime: string;
  taxPostalCode: string;
  rfcUrl: string;
  isDefault: boolean;
}

export interface UserListItemDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  roles: RoleOptionDTO[];
}

export interface UserFormDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  roleIds: string[];
  overrides: PermissionOverrideDTO[];
  addresses: UserAddressDTO[];
  taxProfiles: UserTaxProfileDTO[];
}

export interface ProfileDTO {
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
}
