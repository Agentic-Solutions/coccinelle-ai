import { NextRequest, NextResponse } from 'next/server';

// Use local API in development, production API in production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

// Augmenter le timeout pour les imports de fichiers volumineux
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '';

  try {
    // Construire l'URL en copiant tous les paramètres sauf 'path'
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        params.append(key, value);
      }
    });

    const url = `${API_URL}${path}${params.toString() ? '?' + params.toString() : ''}`;
    console.log('Proxying GET request to:', url);

    // Timeout de 4 minutes pour les requêtes GET
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'demo-key-12345',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '';

  try {
    // Construire l'URL avec tous les paramètres sauf 'path'
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        params.append(key, value);
      }
    });
    const url = `${API_URL}${path}${params.toString() ? '?' + params.toString() : ''}`;

    // Vérifier le Content-Type pour savoir si c'est du FormData ou du JSON
    const contentType = request.headers.get('content-type') || '';
    let body;
    let headers: HeadersInit = {};

    if (contentType.includes('multipart/form-data')) {
      // Pour FormData (upload de fichiers), transférer tel quel
      body = await request.formData();
      // Ne pas définir Content-Type, fetch le fera automatiquement pour FormData
      headers = { 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'demo-key-12345' };
    } else {
      // Pour JSON, parser et re-sérialiser
      body = JSON.stringify(await request.json());
      headers = {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'demo-key-12345'
      };
    }

    console.log('Proxying POST request to:', url);

    // Timeout de 4 minutes pour les requêtes POST (import de fichiers)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
