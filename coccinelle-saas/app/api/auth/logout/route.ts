import { NextResponse } from 'next/server';

/**
 * Endpoint de déconnexion
 * Le token est géré côté client (localStorage), donc pas besoin de le supprimer côté serveur
 */
export async function POST(request: Request) {
  try {
    // La déconnexion est gérée côté client en supprimant le token du localStorage
    // Cet endpoint confirme simplement la déconnexion

    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie'
    }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la déconnexion'
    }, { status: 500 });
  }
}
