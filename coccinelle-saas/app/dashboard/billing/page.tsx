'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  ArrowLeft,
  AlertCircle,
  Check,
  Crown,
  Zap,
  Building2,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Subscription {
  plan: string;
  status: string;
  trial_days_remaining: number | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    icon: Zap,
    color: 'blue',
    features: [
      '1 utilisateur',
      '100 appels / mois',
      'Email + SMS',
      'Base de connaissances',
      'Calendrier integre',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    icon: Crown,
    color: 'purple',
    popular: true,
    features: [
      '5 utilisateurs',
      '500 appels / mois',
      'Tous les canaux',
      'Analytics avances',
      'CRM complet',
      'Automatisations',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    icon: Building2,
    color: 'gray',
    features: [
      'Utilisateurs illimites',
      'Appels illimites',
      'Acces API',
      'Support prioritaire',
      'Multi-sites',
      'Integrations CRM',
      'Manager dedie',
    ],
  },
];

const PLAN_LABELS: Record<string, string> = {
  trial: 'Essai gratuit',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  pro: 79,
  business: 199,
};

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Check for success/canceled query params
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setSuccessMessage('Paiement effectue avec succes ! Votre abonnement est actif.');
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/billing');
    }
    if (params.get('canceled') === 'true') {
      setError('Le paiement a ete annule.');
      window.history.replaceState({}, '', '/dashboard/billing');
    }
    loadSubscription();
  }, []);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    return null;
  };

  const loadSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setError('Non authentifie. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_URL}/api/v1/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      } else {
        // Default trial state if no subscription found
        setSubscription({
          plan: 'trial',
          status: 'trialing',
          trial_days_remaining: 0,
          trial_ends_at: null,
          current_period_end: null,
          current_period_start: null,
          cancel_at_period_end: false,
          stripe_customer_id: null,
        });
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Impossible de charger les donnees d\'abonnement.');
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Erreur lors de la creation de la session de paiement.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/billing/portal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Erreur lors de l\'ouverture du portail.');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isTrial = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isExpired =
    subscription?.status === 'canceled' ||
    subscription?.status === 'past_due' ||
    (isTrial && subscription?.trial_days_remaining !== null && subscription.trial_days_remaining <= 0 && subscription.trial_ends_at);
  const isPastDue = subscription?.status === 'past_due';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Chargement de la facturation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Facturation</h1>
            <p className="text-sm text-gray-500">Gerez votre abonnement et votre facturation</p>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-500 hover:text-green-700 text-sm"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700 text-sm"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Trial banner */}
        {isTrial && subscription?.trial_days_remaining !== null && subscription.trial_days_remaining > 0 && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-900">
                  Essai gratuit — {subscription.trial_days_remaining} jour{subscription.trial_days_remaining > 1 ? 's' : ''} restant{subscription.trial_days_remaining > 1 ? 's' : ''}
                </span>
              </div>
              {subscription.trial_ends_at && (
                <span className="text-xs text-emerald-600">
                  Expire le {new Date(subscription.trial_ends_at).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.max(5, ((14 - (subscription.trial_days_remaining || 0)) / 14) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-emerald-600 mt-2">
              Profitez de toutes les fonctionnalites pendant votre essai. Choisissez un plan avant la fin.
            </p>
          </div>
        )}

        {/* Expired / past_due banner */}
        {isExpired && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-900">
                {isPastDue
                  ? 'Paiement echoue — veuillez mettre a jour votre moyen de paiement'
                  : 'Votre essai est termine — choisissez un plan pour continuer'}
              </span>
            </div>
          </div>
        )}

        {/* Active subscription card */}
        {isActive && subscription && (
          <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Plan actuel</h2>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {PLAN_LABELS[subscription.plan] || subscription.plan}
                  </span>
                  {PLAN_PRICES[subscription.plan] && (
                    <span className="text-gray-500">
                      {PLAN_PRICES[subscription.plan]}&euro; / mois
                    </span>
                  )}
                </div>
                {subscription.current_period_end && (
                  <p className="text-sm text-gray-500 mt-1">
                    Prochaine facture le{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {subscription.cancel_at_period_end && (
                  <p className="text-sm text-orange-600 mt-1 font-medium">
                    Annulation prevue en fin de periode
                  </p>
                )}
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Gerer mon abonnement
              </button>
            </div>
          </div>
        )}

        {/* Plans grid — show when trial, expired, or past_due */}
        {(!isActive || isExpired) && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isActive ? 'Changer de plan' : 'Choisissez votre plan'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = isActive && subscription?.plan === plan.id;
                const isLoading = checkoutLoading === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-xl border-2 p-6 flex flex-col ${
                      plan.popular
                        ? 'border-purple-500 shadow-lg shadow-purple-100'
                        : 'border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">
                        Populaire
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`p-2 rounded-lg ${
                          plan.color === 'blue'
                            ? 'bg-blue-100 text-blue-600'
                            : plan.color === 'purple'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">{plan.price}&euro;</span>
                        <span className="text-gray-500 text-sm">/ mois</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              plan.color === 'blue'
                                ? 'text-blue-500'
                                : plan.color === 'purple'
                                ? 'text-purple-500'
                                : 'text-gray-500'
                            }`}
                          />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleChoosePlan(plan.id)}
                      disabled={isLoading || isCurrentPlan}
                      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : plan.popular
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } disabled:opacity-60`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCurrentPlan ? (
                        'Plan actuel'
                      ) : (
                        'Choisir ce plan'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* FAQ Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions frequentes</h3>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900 text-sm">Puis-je changer de plan a tout moment ?</p>
              <p className="text-sm text-gray-500 mt-1">
                Oui, vous pouvez upgrader ou downgrader votre plan a tout moment. La facturation sera ajustee au prorata.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Que se passe-t-il a la fin de l&apos;essai ?</p>
              <p className="text-sm text-gray-500 mt-1">
                Si vous ne choisissez pas de plan, votre acces sera limite. Vos donnees sont conservees pendant 30 jours.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Comment annuler mon abonnement ?</p>
              <p className="text-sm text-gray-500 mt-1">
                Cliquez sur &quot;Gerer mon abonnement&quot; pour acceder au portail de gestion Stripe et annuler a tout moment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
