import { NextRequest, NextResponse } from 'next/server';

/** Redirect cepat ke /login bila cookie sesi tidak ada. Validasi sebenarnya tetap di API. */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('umira_hd_session');
  const { pathname, search } = req.nextUrl;
  if (!hasSession && !pathname.startsWith('/login')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|icon.svg|manifest.webmanifest|favicon.ico).*)'],
};
