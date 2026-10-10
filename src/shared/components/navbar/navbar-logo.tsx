import Link from 'next/link';
import { LogoLarge } from '@/shared/components/logo-large';

export function NavbarLogo() {
  return (
    <Link href='/' aria-label='Ir al inicio' className='shrink-0'>
      <LogoLarge className='h-8 w-auto' />
    </Link>
  );
}
