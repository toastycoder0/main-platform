'use client';

import { useQueryState } from 'nuqs';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/tabs';

export type AccountTab = 'general' | 'security' | 'addresses' | 'billing';

const TAB_ITEMS: { value: AccountTab; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'security', label: 'Seguridad' },
  { value: 'addresses', label: 'Direcciones' },
  { value: 'billing', label: 'Facturación' },
];

export function ProfileTabs({ tab }: { tab: AccountTab }) {
  const [, setTab] = useQueryState('tab', {
    defaultValue: 'general',
    history: 'replace',
  });

  async function handleValueChange(value: string) {
    await setTab(value as AccountTab);
  }

  return (
    <Tabs value={tab} onValueChange={handleValueChange}>
      <TabsList>
        {TAB_ITEMS.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
