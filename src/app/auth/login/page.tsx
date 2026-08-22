import type { Metadata } from 'next';
import Link from 'next/link';
import { env } from '@/config/env';
import { LoginForm } from '@/modules/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
};

export default function LoginPage() {
  const whatsappMessage = encodeURIComponent(
    'Hola, mucho gusto. Me gustaría obtener información sobre cómo acceder a la plataforma de https://www.boya.com.mx',
  );

  return (
    <article className='mx-auto max-w-md w-full'>
      <header className='mb-5 text-center'>
        <h1 className='font-semibold text-2xl text-neutral-900'>Iniciar sesión en Boya</h1>
        <p className='mt-3 text-sm text-neutral-500'>
          La plataforma líder para distribuidores y contratistas. Accede a nuestro catálogo y
          gestiona tus pedidos al instante.
        </p>
      </header>

      <LoginForm />

      <Link
        href='/auth/forgot-password'
        className='mt-5 text-end text-sm block font-medium text-slate-950 outline-none hover:underline focus-visible:underline'
        aria-label='Recuperar contraseña olvidada'
      >
        ¿Olvidaste tu contraseña?
      </Link>

      <p className='mt-9 text-center text-sm text-neutral-500'>
        ¿No tienes una cuenta?{' '}
        <Link
          href={`https://api.whatsapp.com/send?phone=${env.NEXT_PUBLIC_PHONE}&text=${whatsappMessage}`}
          className='font-medium text-slate-950 outline-none hover:underline focus-visible:underline'
          target='_blank'
          rel='noopener noreferrer'
          aria-label='Contáctanos vía WhatsApp para obtener información sobre cómo acceder a la plataforma'
        >
          Contáctanos
        </Link>
      </p>
    </article>
  );
}
