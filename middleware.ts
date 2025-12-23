import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware per proteggere le rotte che richiedono autenticazione
 * Verifica la presenza del token JWT nei cookies prima di accedere alle rotte protette
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotte che richiedono autenticazione
  const protectedRoutes = ['/cards'];

  // Rotte pubbliche (login, home)
  const publicRoutes = ['/', '/api/graphql'];

  // Se è una rotta pubblica, lascia passare
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Se è una rotta protetta, verifica l'autenticazione
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get('sorare_jwt_token');

    // Se non c'è token, redirect al login
    if (!token) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * Configurazione del matcher per il middleware
 * Specifica quali rotte devono essere processate dal middleware
 */
export const config = {
  matcher: [
    /*
     * Corrisponde a tutte le rotte tranne:
     * - api routes che iniziano con /api (tranne /api/graphql che gestiamo manualmente)
     * - _next/static (file statici)
     * - _next/image (file immagini)
     * - favicon.ico (favicon)
     * - file pubblici
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};

