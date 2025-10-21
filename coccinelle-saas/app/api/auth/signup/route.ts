import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validation basique
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Hash du mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Générer un ID utilisateur
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // TODO: Sauvegarder dans la base de données
    // Pour l'instant, on simule juste
    console.log('Nouvel utilisateur:', { userId, name, email });

    // Redirection vers login
    return NextResponse.redirect(new URL('/login?registered=true', request.url));
  } catch (error) {
    console.error('Erreur signup:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }
}
