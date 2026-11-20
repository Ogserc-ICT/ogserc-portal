import { type NextRequest, NextResponse } from 'next/server'

// The two-factor plugin's admin screens need the current path, which a server component cannot
// read itself (D-084). Passed as a request header, overwriting any value the browser sent, and
// only for the admin panel: public pages never run this.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-pathname', request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
