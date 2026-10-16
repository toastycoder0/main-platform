import Link from 'next/link';
import { LogoLarge } from '@/shared/components/logo-large';

interface NavbarLogoProps {
  href?: string;
}

export function NavbarLogo({ href = '/' }: NavbarLogoProps) {
  return (
    <Link href={href} aria-label='Ir al inicio' className='shrink-0'>
      <LogoLarge className='h-8 w-auto' />
    </Link>
  );
}
