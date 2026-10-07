import type { Metadata } from 'next';
import Link from 'next/link';
import { resetPasswordPageSchema } from '@/modules/auth/application/auth.validation';
import { ResetPasswordForm } from '@/modules/auth/components/reset-password-form';

export const metadata: Metadata = {
  title: 'Restablecer contraseña',
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function InvalidLink() {
  return (
    <article className='mx-auto max-w-md w-full text-center'>
      <header className='mb-5'>
        <h1 className='font-semibold text-2xl text-neutral-900'>Enlace inválido</h1>
        <p className='mt-3 text-sm text-neutral-500'>
          El enlace de restablecimiento no es válido o expiró.
        </p>
      </header>
      <Link
        href='/auth/forgot-password'
        className='block text-sm font-medium text-slate-950 outline-none hover:underline focus-visible:underline'
      >
        Solicitar un nuevo enlace
      </Link>
    </article>
  );
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const parsed = resetPasswordPageSchema.safeParse(await searchParams);

  if (!parsed.success || parsed.data.error || !parsed.data.token) {
    return <InvalidLink />;
  }

  return (
    <article className='mx-auto max-w-md w-full'>
      <header className='mb-5 text-center'>
        <h1 className='font-semibold text-2xl text-neutral-900'>Elige tu nueva contraseña</h1>
        <p className='mt-3 text-sm text-neutral-500'>
          Define una contraseña segura para tu cuenta.
        </p>
      </header>

      <ResetPasswordForm token={parsed.data.token} />

      <p className='mt-5 text-center text-sm text-neutral-500'>
        <Link
          href='/auth/login'
          className='font-medium text-slate-950 outline-none hover:underline focus-visible:underline'
        >
          Volver al inicio de sesión
        </Link>
      </p>
    </article>
  );
}
