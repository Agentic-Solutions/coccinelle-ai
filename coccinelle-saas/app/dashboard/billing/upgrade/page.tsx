'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Zap, Crown, Building2, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface Plan {
  planId: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  includedCalls: number;
  includedSms: number;
  includedTtsMinutes: number;
  includedWhatsapp: number;
  overpriceCalls: number;
  overpriceSms: number;
  overpriceTts: number;
  overpriceWhatsapp: number;
  features: string[];
  isActive: boolean;
}

interface CurrentSubscription {
  planId: string;
  billingPeriod: string;
  status: string;
}

export default function UpgradePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
    loadCurrentSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/plans?activeOnly=true`);
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      // TODO: Remplacer par le vrai tenantId de l'utilisateur connecté
      const tenantId = 'tenant_123';
      const res = await fetch(`${API_URL}/api/v1/billing/subscriptions?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.success && data.subscription) {
        setCurrentSubscription({
          planId: data.subscription.plan_id,
          billingPeriod: data.subscription.billing_period,
          status: data.subscription.status
        });
        setBillingPeriod(data.subscription.billing_period === 'yearly' ? 'yearly' : 'monthly');
      }
    } catch (error) {
      console.error('Error loading current subscription:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setProcessingPlanId(planId);
    try {
      // TODO: Remplacer par les vraies données de l'utilisateur connecté
      const tenantId = 'tenant_123';
      const email = 'user@example.com';
      const name = 'John Doe';

      const res = await fetch(`${API_URL}/api/v1/billing/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          planId,
          billingPeriod,
          email,
          name
        })
      });

      const data = await res.json();
      if (data.success && data.url) {
        // Rediriger vers la page de paiement Stripe
        window.location.href = data.url;
      } else {
        console.error('Error creating checkout session:', data.error);
        alert('Erreur lors de la création de la session de paiement');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Erreur lors de la mise à niveau');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free_trial':
        return <Zap className="h-6 w-6" />;
      case 'starter':
        return <Zap className="h-6 w-6" />;
      case 'pro':
        return <Crown className="h-6 w-6" />;
      case 'enterprise':
        return <Building2 className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId;
  };

  const canUpgrade = (planId: string) => {
    if (planId === 'free_trial') return false;
    if (!currentSubscription) return true;
    if (isCurrentPlan(planId)) return false;
    return true;
  };

  const getYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const savings = monthlyCost - yearlyPrice;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { savings, percentage };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choisissez votre plan</h1>
          <p className="text-gray-600">
            Sélectionnez le plan qui correspond le mieux à vos besoins
          </p>
        </div>

        {/* Toggle Mensuel / Annuel */}
        <div className="flex justify-center mb-8">
          <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')} className="w-auto">
            <TabsList>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">
                Annuel
                <Badge variant="secondary" className="ml-2">-20%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Grille des plans */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = billingPeriod === 'yearly' ? plan.yearlyPriceCents : plan.monthlyPriceCents;
            const monthlyEquivalent = billingPeriod === 'yearly' ? plan.yearlyPriceCents / 12 : plan.monthlyPriceCents;
            const savings = getYearlySavings(plan.monthlyPriceCents, plan.yearlyPriceCents || 0);
            const current = isCurrentPlan(plan.planId);

            return (
              <Card key={plan.planId} className={`relative ${current ? 'border-primary border-2' : ''}`}>
                {current && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Plan actuel</Badge>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {getPlanIcon(plan.planId)}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>

                  <div className="mt-4">
                    {plan.planId === 'free_trial' ? (
                      <div>
                        <div className="text-3xl font-bold">Gratuit</div>
                        <div className="text-sm text-gray-500">7 jours d'essai</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl font-bold">
                          {formatPrice(monthlyEquivalent)}€
                          <span className="text-base font-normal text-gray-500">/mois</span>
                        </div>
                        {billingPeriod === 'yearly' && (
                          <div className="text-sm text-green-600 mt-1">
                            Économisez {savings.percentage}% ({formatPrice(savings.savings)}€/an)
                          </div>
                        )}
                        {billingPeriod === 'yearly' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Facturé {formatPrice(price)}€ annuellement
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{plan.includedCalls} appels inclus</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{plan.includedSms} SMS inclus</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{plan.includedTtsMinutes} minutes TTS</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{plan.includedWhatsapp} messages WhatsApp</span>
                    </li>
                    {plan.features && plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={current ? 'outline' : 'default'}
                    disabled={!canUpgrade(plan.planId) || processingPlanId !== null}
                    onClick={() => handleUpgrade(plan.planId)}
                  >
                    {processingPlanId === plan.planId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : current ? (
                      'Plan actuel'
                    ) : plan.planId === 'free_trial' ? (
                      'Démarrer l\'essai'
                    ) : (
                      'Choisir ce plan'
                    )}
                  </Button>

                  {!current && plan.planId !== 'free_trial' && (
                    <div className="mt-4 text-xs text-gray-500 text-center">
                      Dépassements facturés :<br/>
                      Appels {formatPrice(plan.overpriceCalls)}€/min • SMS {formatPrice(plan.overpriceSms)}€/msg
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Paiement sécurisé par Stripe • Annulation possible à tout moment</p>
          <p className="mt-2">Des questions ? Contactez-nous à support@coccinelle.ai</p>
        </div>
      </div>
    </div>
  );
}
