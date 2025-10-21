import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // TODO: Vérifier dans la base de données
    // Pour l'instant, on simule
    console.log('Tentative de connexion:', email);

    // Simulation: accepter n'importe quel login pour le moment
    // Plus tard, on vérifiera vraiment les credentials
    
    // Créer un token simple (à améliorer avec JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    // Créer la réponse avec redirection
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Définir le cookie de session
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    });

    return response;
  } catch (error) {
    console.error('Erreur login:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
