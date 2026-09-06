import Link from 'next/link';
import { logout } from '@/modules/auth/infrastructure/auth.action';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { Button, buttonVariants } from '@/shared/components/button';

async function Home() {
  const session = await getSession();

  return (
    <div className='p-8'>
      {session ? (
        <form action={logout}>
          <Button type='submit'>Cerrar sesión</Button>
        </form>
      ) : (
        <Link className={buttonVariants()} href='/auth/login'>
          Iniciar sesión
        </Link>
      )}
    </div>
  );
}

export default Home;
