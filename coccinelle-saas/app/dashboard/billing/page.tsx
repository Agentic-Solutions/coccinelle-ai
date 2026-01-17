'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  TrendingUp,
  FileText,
  ArrowRight,
  Phone,
  MessageSquare,
  Mic,
  ArrowLeft,
  AlertCircle,
  Check
} from 'lucide-react';
import Link from 'next/link';
import Logo from '../../../src/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface Plan {
  planId: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    yearly: number | null;
    currency: string;
  };
  included: {
    calls: number;
    sms: number;
    ttsMinutes: number;
    storageGb: number;
  };
  features: string[];
}

interface Usage {
  periodStart: string;
  periodEnd: string;
  usage: {
    calls: {
      used: number;
      included: number;
      overage: number;
      overageCost: number;
    };
    sms: {
      used: number;
      included: number;
      overage: number;
      overageCost: number;
    };
    tts: {
      used: number;
      included: number;
      overage: number;
      overageCost: number;
    };
  };
  totalOverageCost: number;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  // Mock tenant ID - dans un vrai système, ceci viendrait de l'auth
  const tenantId = 'demo-tenant-001';

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Charger les plans pour obtenir le plan "Starter" par défaut
      const plansRes = await fetch(`${API_URL}/api/v1/billing/plans?activeOnly=true`);
      const plansData = await plansRes.json();

      // Pour le moment, on affiche le plan Starter par défaut
      const starterPlan = plansData.plans.find((p: Plan) => p.planId === 'starter');
      if (starterPlan) {
        setPlan(starterPlan);
      }

      // Mock usage data - en attendant d'avoir des vraies données
      const mockUsage: Usage = {
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
        usage: {
          calls: {
            used: 45,
            included: starterPlan?.included.calls || 100,
            overage: 0,
            overageCost: 0
          },
          sms: {
            used: 120,
            included: starterPlan?.included.sms || 200,
            overage: 0,
            overageCost: 0
          },
          tts: {
            used: 78,
            included: starterPlan?.included.ttsMinutes || 120,
            overage: 0,
            overageCost: 0
          }
        },
        totalOverageCost: 0
      };
      setUsage(mockUsage);

    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (used: number, included: number) => {
    if (included === 0) return 0;
    return Math.min((used / included) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement de la facturation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facturation & Abonnement</h1>
              <p className="text-gray-600">Gérez votre plan et suivez votre consommation</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Plan actuel */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Plan Actuel</h2>
                  <p className="text-sm text-gray-600">Votre abonnement</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing/upgrade"
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Changer de plan
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {plan && (
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <span className="text-3xl font-bold text-gray-900">{plan.pricing.monthly}€</span>
                  <span className="text-gray-600">/mois</span>
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-700">Appels inclus</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{plan.included.calls}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-700">SMS inclus</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{plan.included.sms}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-700">Minutes TTS</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{plan.included.ttsMinutes}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-700">Stockage</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{plan.included.storageGb} GB</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Fonctionnalités incluses:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div className="space-y-4">
            <Link
              href="/dashboard/billing/usage"
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-gray-700" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Usage Détaillé</h3>
              <p className="text-sm text-gray-600">Consultez votre consommation en détail</p>
            </Link>

            <Link
              href="/dashboard/billing/invoices"
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-700" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Factures</h3>
              <p className="text-sm text-gray-600">Accédez à l'historique de vos factures</p>
            </Link>

            <Link
              href="/dashboard/billing/payment"
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-gray-700" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Paiement</h3>
              <p className="text-sm text-gray-600">Gérez vos moyens de paiement</p>
            </Link>
          </div>
        </div>

        {/* Utilisation du mois */}
        {usage && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Utilisation ce mois</h2>
                <p className="text-sm text-gray-600">
                  Du {new Date(usage.periodStart).toLocaleDateString('fr-FR')} au {new Date(usage.periodEnd).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {usage.totalOverageCost > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Dépassement</p>
                    <p className="text-xs text-yellow-700">{usage.totalOverageCost.toFixed(2)}€</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Appels */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Appels</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {usage.usage.calls.used} / {usage.usage.calls.included}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${getUsageColor(getUsagePercentage(usage.usage.calls.used, usage.usage.calls.included))} h-3 rounded-full transition-all`}
                    style={{ width: `${getUsagePercentage(usage.usage.calls.used, usage.usage.calls.included)}%` }}
                  ></div>
                </div>
                {usage.usage.calls.overage > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    +{usage.usage.calls.overage} en dépassement ({usage.usage.calls.overageCost.toFixed(2)}€)
                  </p>
                )}
              </div>

              {/* SMS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">SMS</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {usage.usage.sms.used} / {usage.usage.sms.included}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${getUsageColor(getUsagePercentage(usage.usage.sms.used, usage.usage.sms.included))} h-3 rounded-full transition-all`}
                    style={{ width: `${getUsagePercentage(usage.usage.sms.used, usage.usage.sms.included)}%` }}
                  ></div>
                </div>
                {usage.usage.sms.overage > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    +{usage.usage.sms.overage} en dépassement ({usage.usage.sms.overageCost.toFixed(2)}€)
                  </p>
                )}
              </div>

              {/* TTS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Minutes TTS</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {usage.usage.tts.used} / {usage.usage.tts.included}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${getUsageColor(getUsagePercentage(usage.usage.tts.used, usage.usage.tts.included))} h-3 rounded-full transition-all`}
                    style={{ width: `${getUsagePercentage(usage.usage.tts.used, usage.usage.tts.included)}%` }}
                  ></div>
                </div>
                {usage.usage.tts.overage > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    +{usage.usage.tts.overage} min en dépassement ({usage.usage.tts.overageCost.toFixed(2)}€)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Coûts estimés */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Coûts estimés ce mois</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Abonnement</p>
              <p className="text-2xl font-bold text-gray-900">{plan?.pricing.monthly || 0}€</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Dépassements</p>
              <p className="text-2xl font-bold text-gray-900">{usage?.totalOverageCost.toFixed(2) || '0.00'}€</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">TVA (20%)</p>
              <p className="text-2xl font-bold text-gray-900">
                {((plan?.pricing.monthly || 0) * 0.2 + (usage?.totalOverageCost || 0) * 0.2).toFixed(2)}€
              </p>
            </div>
            <div className="p-4 bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-300 mb-1">Total</p>
              <p className="text-2xl font-bold text-white">
                {((plan?.pricing.monthly || 0) + (usage?.totalOverageCost || 0) + ((plan?.pricing.monthly || 0) * 0.2) + ((usage?.totalOverageCost || 0) * 0.2)).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
