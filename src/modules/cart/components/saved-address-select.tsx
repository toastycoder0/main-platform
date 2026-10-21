'use client';

import type { UserAddressDTO } from '@/modules/users/application/users.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { MANUAL_OPTION } from '../application/checkout.constants';
import { formatAddress } from '../application/checkout.mapping';

interface SavedAddressSelectProps {
  addresses: UserAddressDTO[];
  value: string;
  label: string;
  onValueChange: (value: string) => void;
  onSelectAddress: (address: UserAddressDTO | null) => void;
}

export function SavedAddressSelect({
  addresses,
  value,
  label,
  onValueChange,
  onSelectAddress,
}: SavedAddressSelectProps) {
  function handleChange(next: string): void {
    onValueChange(next);

    if (next === MANUAL_OPTION) {
      onSelectAddress(null);
      return;
    }

    onSelectAddress(addresses.find((item) => item.id === next) ?? null);
  }

  return (
    <div className='flex flex-col gap-2'>
      <span className='text-sm font-medium'>{label}</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Selecciona una dirección guardada' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MANUAL_OPTION}>Capturar manualmente</SelectItem>
          {addresses.map((address) => (
            <SelectItem key={address.id} value={address.id}>
              {address.name || formatAddress(address)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
