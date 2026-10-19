import Link from 'next/link';
import { LogoLarge } from '@/shared/components/logo-large';
import { cn } from '@/shared/utils/cn';

interface NavbarLogoProps {
  href?: string;
  className?: string;
}

export function NavbarLogo({ href = '/', className }: NavbarLogoProps) {
  return (
    <Link href={href} aria-label='Ir al inicio' className={cn('shrink-0', className)}>
      <LogoLarge className='h-8 w-auto' />
    </Link>
  );
}
