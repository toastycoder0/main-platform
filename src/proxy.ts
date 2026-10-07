import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Los endpoints admin de better-auth solo deben invocarse desde el servidor
  // (auth.api.* dentro de Server Actions). Exponerlos por HTTP permitiría a
  // cualquier sesión con role=admin saltarse el RBAC de la aplicación.
  if (pathname.startsWith('/api/auth/admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
