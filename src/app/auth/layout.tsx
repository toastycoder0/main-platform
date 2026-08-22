import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoLarge } from '@/shared/components/logo-large';

interface AuthLayoutProps {
  children?: ReactNode;
}

const TESTIMONIAL = {
  quote:
    'Desde que usamos Boya, gestionar los pedidos de recubrimientos y materiales es m\u00e1s r\u00e1pido que nunca. Una plataforma pensada para el sector.',
  author: 'Carlos Mendoza',
  role: 'Gerente de Compras, Constructora MR',
};

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='flex min-h-dvh'>
      <aside className='hidden lg:flex lg:w-2/5 relative bg-neutral-900'>
        <div className='grow bg-[url(/assets/bg-auth.webp)] opacity-40 bg-cover bg-center' />

        <div className='absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/30 to-transparent' />

        <Link href='/' className='absolute top-10 left-10'>
          <LogoLarge className='h-7 w-auto text-white' />
        </Link>

        <figure className='absolute bottom-14 left-10 right-14'>
          <blockquote className='text-xl font-medium leading-relaxed text-white/90'>
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </blockquote>
          <figcaption className='mt-5'>
            <p className='font-semibold text-white'>{TESTIMONIAL.author}</p>
            <p className='text-sm text-white/55'>{TESTIMONIAL.role}</p>
          </figcaption>
        </figure>
      </aside>

      <main className='flex flex-1 flex-col'>
        <section className='flex items-center justify-between px-8 pt-7'>
          <Link
            href='/'
            className='text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-900'
          >
            &larr; Volver al inicio
          </Link>
          <Link href='/' className='lg:hidden'>
            <LogoLarge className='h-6 w-auto text-neutral-900' />
          </Link>
        </section>

        <section className='px-6 pt-6 pb-8 m-auto w-full max-w-112.5'>{children}</section>
      </main>
    </div>
  );
}

export default AuthLayout;
