'use client';

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/components/combobox';

export interface WarehouseOption {
  value: string;
  label: string;
}

interface WarehouseOptionComboboxProps {
  id: string;
  label: string;
  value: string;
  items: WarehouseOption[];
  placeholder: string;
  invalid?: boolean;
  className?: string;
  contentClassName?: string;
  onValueChange: (value: string) => void;
}

export function WarehouseOptionCombobox({
  id,
  label,
  value,
  items,
  placeholder,
  invalid = false,
  className = 'w-full min-w-40',
  contentClassName,
  onValueChange,
}: WarehouseOptionComboboxProps) {
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      isItemEqualToValue={(item, current) => item.value === current.value}
      items={items}
      onValueChange={(next) => onValueChange(next?.value ?? '')}
      value={selected}
    >
      <ComboboxInput
        aria-invalid={invalid}
        aria-label={label}
        className={className}
        id={id}
        placeholder={placeholder}
        showClear={selected !== null}
      />
      <ComboboxContent className={contentClassName}>
        <ComboboxList>
          <ComboboxCollection>
            {(item: WarehouseOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxCollection>
          <ComboboxEmpty>Sin resultados</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
