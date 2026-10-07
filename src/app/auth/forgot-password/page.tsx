import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/modules/auth/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
};

export default function ForgotPasswordPage() {
  return (
    <article className='mx-auto max-w-md w-full'>
      <header className='mb-5 text-center'>
        <h1 className='font-semibold text-2xl text-neutral-900'>Recupera tu contraseña</h1>
        <p className='mt-3 text-sm text-neutral-500'>
          Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para elegir una nueva
          contraseña.
        </p>
      </header>

      <ForgotPasswordForm />

      <Link
        href='/auth/login'
        className='mt-5 block text-center text-sm font-medium text-slate-950 outline-none hover:underline focus-visible:underline'
      >
        Volver al inicio de sesión
      </Link>
    </article>
  );
}
