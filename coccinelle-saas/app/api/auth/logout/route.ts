import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  
  // Supprimer le cookie
  response.cookies.delete('auth_token');
  
  return response;
}
