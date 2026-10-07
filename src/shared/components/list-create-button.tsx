import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/button';

interface ListCreateButtonProps {
  href: string;
  children: React.ReactNode;
}

export function ListCreateButton({ href, children }: ListCreateButtonProps) {
  return (
    <Button asChild>
      <Link href={href}>
        <PlusIcon aria-hidden />
        {children}
      </Link>
    </Button>
  );
}
