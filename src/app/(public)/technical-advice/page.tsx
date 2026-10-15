import Link from 'next/link';
import type { Metadata } from 'next/types';
import { env } from '@/config/env';
import { TechnicalAdviceForm } from '@/modules/technical-advice/components/technical-advice-form';

export const metadata: Metadata = {
  title: 'Asesor\u00edas',
};

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/boya' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/boya' },
  { label: 'Facebook', href: 'https://facebook.com/boya' },
  { label: 'TikTok', href: 'https://tiktok.com/@boya' },
];

const ContactPage = () => {
  return (
    <section className='relative overflow-hidden rounded-lg bg-neutral-950'>
      <picture>
        <img
          src='/assets/bg-generic.webp'
          className='object-cover opacity-30 absolute left-0 top-0 w-full h-full'
          sizes='100vw'
          alt='Fondo Asesor\u00edas'
        />
      </picture>

      <div className='absolute inset-0 bg-linear-to-br from-neutral-950/20 via-neutral-950/15 to-neutral-950/20' />

      <div className='relative z-10 grid gap-12 p-4 md:p-8 lg:grid-cols-[1fr_460px] lg:gap-16 lg:p-14'>
        <div className='flex flex-col'>
          <h1 className='text-3xl font-bold leading-tight text-white lg:text-4xl lg:leading-tight'>
            &iquest;Tienes preguntas?
            <br />
            Tenemos respuestas
          </h1>
          <p className='mt-4 max-w-lg text-base leading-relaxed text-white/70'>
            Nuestro equipo de especialistas en recubrimientos y materiales de construcci&oacute;n
            est&aacute; listo para ayudarte con cualquier consulta t&eacute;cnica o comercial.
          </p>

          <div className='mt-auto grid gap-8 pt-16 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-10'>
            <div className='sm:col-span-2'>
              <h3 className='text-sm font-semibold text-white'>Redes Sociales</h3>
              <ul className='mt-3 space-y-1.5'>
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className='text-sm text-white/60 transition-colors hover:text-white'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className='text-sm font-semibold text-white'>Email</h3>
              <a
                href={`mailto:${env.NEXT_PUBLIC_EMAIL}`}
                className='mt-3 block text-sm text-white/60 transition-colors hover:text-white'
              >
                {env.NEXT_PUBLIC_EMAIL}
              </a>
            </div>

            <div>
              <h3 className='text-sm font-semibold text-white'>Contacto</h3>
              <a
                href={`tel:${env.NEXT_PUBLIC_PHONE}`}
                className='mt-3 block text-sm text-white/60 transition-colors hover:text-white'
              >
                {env.NEXT_PUBLIC_PHONE}
              </a>
            </div>
          </div>
        </div>

        <div className='rounded-xl bg-white p-8 shadow-2xl shadow-neutral-950/25'>
          <h2 className='text-xl font-semibold text-neutral-900'>
            Cu&eacute;ntanos qu&eacute; necesitas
          </h2>
          <p className='mt-1.5 text-sm text-neutral-500'>
            Completa el formulario y uno de nuestros asesores te contactar&aacute; en menos de 24
            horas.
          </p>

          <TechnicalAdviceForm />
        </div>
      </div>
    </section>
  );
};

export default ContactPage;
