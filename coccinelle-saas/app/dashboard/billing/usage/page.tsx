'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Phone,
  MessageSquare,
  Volume2,
  MessageCircle,
  TrendingUp,
  Download,
  Calendar,
  Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface UsageItem {
  usage_id: string;
  usage_type: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  recorded_at: string;
  metadata?: any;
}

interface UsageSummary {
  totalCalls: number;
  totalSms: number;
  totalTtsMinutes: number;
  totalWhatsapp: number;
  totalCost: number;
  byDay: { [date: string]: UsageByType };
}

interface UsageByType {
  calls: number;
  sms: number;
  tts: number;
  whatsapp: number;
  cost: number;
}

export default function UsagePage() {
  const [usageHistory, setUsageHistory] = useState<UsageItem[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [period, setPeriod] = useState<'7days' | '30days' | 'all'>('30days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [period]);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par le vrai tenantId de l'utilisateur connecté
      const tenantId = 'tenant_123';

      // Charger l'historique d'usage
      const historyRes = await fetch(
        `${API_URL}/api/v1/billing/usage/history?tenantId=${tenantId}&period=${period}`
      );
      const historyData = await historyRes.json();

      // Charger le résumé
      const summaryRes = await fetch(
        `${API_URL}/api/v1/billing/usage/summary?tenantId=${tenantId}&period=${period}`
      );
      const summaryData = await summaryRes.json();

      if (historyData.success) {
        setUsageHistory(historyData.usage || []);
      }

      if (summaryData.success) {
        setSummary(summaryData.summary);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsageTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'tts':
        return <Volume2 className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getUsageTypeLabel = (type: string) => {
    switch (type) {
      case 'call':
        return 'Appel téléphonique';
      case 'sms':
        return 'SMS';
      case 'tts':
        return 'Text-to-Speech';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return type;
    }
  };

  const getUsageQuantityDisplay = (type: string, quantity: number) => {
    switch (type) {
      case 'call':
      case 'tts':
        return `${quantity} min`;
      case 'sms':
      case 'whatsapp':
        return `${quantity} msg`;
      default:
        return quantity;
    }
  };

  const exportToCSV = () => {
    if (!usageHistory.length) return;

    const headers = ['Date', 'Type', 'Quantité', 'Prix unitaire', 'Prix total'];
    const rows = usageHistory.map(item => [
      formatDate(item.recorded_at),
      getUsageTypeLabel(item.usage_type),
      getUsageQuantityDisplay(item.usage_type, item.quantity),
      `${formatPrice(item.unit_price_cents)}€`,
      `${formatPrice(item.total_price_cents)}€`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usage-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Consommation détaillée</h1>
            <p className="text-gray-600">
              Suivez votre utilisation en temps réel
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Sélection de la période */}
        <div className="mb-6">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="7days">7 derniers jours</TabsTrigger>
              <TabsTrigger value="30days">30 derniers jours</TabsTrigger>
              <TabsTrigger value="all">Tout</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Résumé */}
        {summary && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Appels
                </CardTitle>
                <Phone className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalCalls}</div>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  SMS
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalSms}</div>
                <p className="text-xs text-gray-500 mt-1">messages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Text-to-Speech
                </CardTitle>
                <Volume2 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalTtsMinutes}</div>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Coût total
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(summary.totalCost * 100)}€</div>
                <p className="text-xs text-gray-500 mt-1">période sélectionnée</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tableau d'historique */}
        <Card>
          <CardHeader>
            <CardTitle>Historique d'utilisation</CardTitle>
            <CardDescription>
              Détail de toutes vos consommations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageHistory.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Aucune utilisation pour cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Quantité</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Prix unitaire</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageHistory.map((item) => (
                      <tr key={item.usage_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {formatDate(item.recorded_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getUsageTypeIcon(item.usage_type)}
                            <span className="text-sm">
                              {getUsageTypeLabel(item.usage_type)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          {getUsageQuantityDisplay(item.usage_type, item.quantity)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          {formatPrice(item.unit_price_cents)}€
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium">
                          {formatPrice(item.total_price_cents)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right font-medium">
                        Total
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatPrice(
                          usageHistory.reduce((sum, item) => sum + item.total_price_cents, 0)
                        )}€
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Les données sont mises à jour en temps réel</p>
        </div>
      </div>
    </div>
  );
}
