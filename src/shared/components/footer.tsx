import { Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { env } from '@/config/env';
import { LogoLarge } from '@/shared/components/logo-large';
import { basicNavLinks, companyLinks } from '@/shared/constants/links';

const SITE_NAME = 'Boya';

const legalLinks = [
  { label: 'T\u00e9rminos y Condiciones', href: '/terms' },
  { label: 'Pol\u00edtica de Privacidad', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/boya' },
  { label: 'Instagram', href: 'https://instagram.com/boya' },
  { label: 'Facebook', href: 'https://facebook.com/boya' },
  { label: 'YouTube', href: 'https://youtube.com/@boya' },
];

const currentYear = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className='rounded-t-2xl bg-white'>
      <div className='mx-auto max-w-360 px-4 pb-8 pt-12 md:px-6'>
        <div className='flex flex-col md:flex-row md:items-center gap-6 justify-between pb-8'>
          <Link href='/' aria-label='Ir al inicio' className='shrink-0'>
            <LogoLarge className='h-7 w-auto text-neutral-900' />
          </Link>
          <p className='text-sm text-neutral-500'>Materiales de construcci&oacute;n al por mayor</p>
        </div>

        <hr className='border-neutral-200' />

        <div className='grid gap-12 py-10 sm:grid-cols-[1fr_1fr_1fr_auto]'>
          <div>
            <h3 className='text-sm font-semibold text-neutral-900'>Empresa</h3>
            <ul className='mt-4 space-y-2.5'>
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-neutral-500 transition-colors hover:text-neutral-900'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className='text-sm font-semibold text-neutral-900'>Navegaci&oacute;n</h3>
            <ul className='mt-4 space-y-2.5'>
              {basicNavLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-neutral-500 transition-colors hover:text-neutral-900'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className='text-sm font-semibold text-neutral-900'>Contacto</h3>
            <ul className='mt-4 space-y-3'>
              <li>
                <a
                  href={`mailto:${env.NEXT_PUBLIC_EMAIL}`}
                  className='inline-flex items-center gap-2.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900'
                >
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500'>
                    <Mail className='size-4' aria-hidden='true' />
                  </span>
                  {env.NEXT_PUBLIC_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${env.NEXT_PUBLIC_PHONE}`}
                  className='inline-flex items-center gap-2.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900'
                >
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500'>
                    <Phone className='size-4' aria-hidden='true' />
                  </span>
                  {env.NEXT_PUBLIC_PHONE}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='text-sm font-semibold text-neutral-900'>Redes sociales</h3>
            <ul className='mt-4 space-y-2.5'>
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm text-neutral-500 transition-colors hover:text-neutral-900'
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className='border-neutral-200' />

        <div className='flex flex-col lg:flex-row items-center justify-between pt-6'>
          <p className='text-xs text-neutral-400'>
            &copy; {currentYear} {SITE_NAME}. Todos los derechos reservados.
          </p>
          <div className='flex flex-col lg:flex-row items-center gap-6'>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='text-xs text-neutral-400 transition-colors hover:text-neutral-600'
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
