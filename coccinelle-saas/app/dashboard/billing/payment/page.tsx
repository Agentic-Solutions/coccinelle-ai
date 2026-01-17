'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Shield, ExternalLink, Loader2, Info } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);

  const openStripePortal = async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par le vrai tenantId de l'utilisateur connecté
      const tenantId = 'tenant_123';

      const res = await fetch(`${API_URL}/api/v1/billing/stripe/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId })
      });

      const data = await res.json();
      if (data.success && data.url) {
        // Rediriger vers le portail Stripe
        window.location.href = data.url;
      } else {
        console.error('Error creating portal session:', data.error);
        alert('Erreur lors de l\'ouverture du portail de paiement');
      }
    } catch (error) {
      console.error('Error opening Stripe portal:', error);
      alert('Erreur lors de l\'ouverture du portail de paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Méthodes de paiement</h1>
          <p className="text-gray-600">
            Gérez vos cartes bancaires et méthodes de paiement
          </p>
        </div>

        {/* Portail Stripe */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Portail de paiement sécurisé</CardTitle>
                <CardDescription>
                  Gérez toutes vos méthodes de paiement via Stripe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Paiements 100% sécurisés par Stripe</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Cartes bancaires et virements SEPA acceptés</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Modifiez ou supprimez vos cartes à tout moment</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={openStripePortal}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ouvrir le portail de paiement
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Information sur le portail Stripe */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Que puis-je faire dans le portail Stripe ?</strong>
            <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
              <li>Ajouter une nouvelle carte bancaire ou méthode de paiement</li>
              <li>Définir une carte par défaut pour les paiements</li>
              <li>Supprimer une carte bancaire</li>
              <li>Voir l'historique de vos paiements</li>
              <li>Mettre à jour vos informations de facturation</li>
              <li>Télécharger vos factures</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Cartes acceptées */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Méthodes de paiement acceptées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <CreditCard className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-sm font-medium">Visa</span>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <CreditCard className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-sm font-medium">Mastercard</span>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <CreditCard className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-sm font-medium">Amex</span>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <CreditCard className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-sm font-medium">SEPA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sécurité et confidentialité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Vos informations de paiement sont entièrement sécurisées :</strong>
            </p>
            <ul className="ml-4 space-y-2 list-disc">
              <li>
                <strong>Chiffrement SSL/TLS</strong> : Toutes les données sont chiffrées en transit
              </li>
              <li>
                <strong>PCI-DSS Level 1</strong> : Stripe est certifié au plus haut niveau de sécurité des paiements
              </li>
              <li>
                <strong>Aucun stockage local</strong> : Nous ne stockons jamais vos informations de carte bancaire
              </li>
              <li>
                <strong>Authentification 3D Secure</strong> : Protection supplémentaire pour les paiements en ligne
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Support */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Des questions sur vos paiements ?{' '}
            <a href="mailto:support@coccinelle.ai" className="text-blue-600 hover:underline">
              Contactez notre support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
