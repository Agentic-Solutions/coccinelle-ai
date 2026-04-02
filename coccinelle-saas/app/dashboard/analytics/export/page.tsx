'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, CheckCircle, Calendar } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

type ExportType = 'calls' | 'messages' | 'prospects';
type Period = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsExportPage() {
  const [exportType, setExportType] = useState<ExportType>('calls');
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExported(false);

    try {
      let endpoint = '';
      const params = new URLSearchParams();

      if (period === 'custom') {
        params.set('start', customStart);
        params.set('end', customEnd);
      } else {
        params.set('period', period);
      }

      switch (exportType) {
        case 'calls':
          endpoint = '/api/v1/analytics/sara';
          break;
        case 'messages':
          endpoint = '/api/v1/analytics/overview';
          break;
        case 'prospects':
          endpoint = '/api/v1/prospects';
          break;
      }

      const res = await fetch(buildApiUrl(`${endpoint}?${params.toString()}`), {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        const csv = convertToCSV(data, exportType);
        downloadCSV(csv, `coccinelle_${exportType}_${period}.csv`);
        setExported(true);
        setTimeout(() => setExported(false), 3000);
      }
    } catch {
      // Error handling silencieux
    }
    setExporting(false);
  }

  function convertToCSV(data: Record<string, unknown>, type: ExportType): string {
    if (type === 'calls') {
      const rows = (data.calls_by_day as { day: string; count: number }[]) || [];
      const header = 'Date,Nombre d\'appels\n';
      return header + rows.map((r) => `${r.day},${r.count || 0}`).join('\n');
    }

    if (type === 'messages') {
      const header = 'Métrique,Valeur\n';
      return header + [
        `SMS envoyés,${data.total_sms || 0}`,
        `WhatsApp envoyés,${data.total_whatsapp || 0}`,
        `Emails envoyés,${data.total_email || 0}`,
        `Taux de réponse,${data.response_rate || 0}%`,
      ].join('\n');
    }

    if (type === 'prospects') {
      const prospects = (data.prospects as { first_name?: string; last_name?: string; email?: string; phone?: string; status?: string; source?: string; created_at?: string }[])
        || (Array.isArray(data) ? data as { first_name?: string; last_name?: string; email?: string; phone?: string; status?: string; source?: string; created_at?: string }[] : []);
      const header = 'Prénom,Nom,Email,Téléphone,Statut,Source,Créé le\n';
      return header + prospects.map((p) =>
        `"${p.first_name || ''}","${p.last_name || ''}","${p.email || ''}","${p.phone || ''}","${p.status || ''}","${p.source || ''}","${p.created_at || ''}"`
      ).join('\n');
    }

    return '';
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const exportTypes: { value: ExportType; label: string; description: string }[] = [
    { value: 'calls', label: 'Appels', description: 'Historique des appels par jour' },
    { value: 'messages', label: 'Messages', description: 'SMS, WhatsApp et emails envoyés' },
    { value: 'prospects', label: 'Prospects', description: 'Liste complète des prospects' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-6 h-6 text-gray-700" />
              Export
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Exportez vos données en CSV</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Type selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Type de données</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {exportTypes.map(t => (
              <button
                key={t.value}
                onClick={() => setExportType(t.value)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  exportType === t.value
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500 mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Period selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Période</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { value: '7d', label: '7 jours' },
              { value: '30d', label: '30 jours' },
              { value: '90d', label: '90 jours' },
              { value: 'custom', label: 'Personnalisé' },
            ] as const).map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <span className="text-gray-400">à</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          )}
        </div>

        {/* Export button */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <button
            onClick={handleExport}
            disabled={exporting || (period === 'custom' && (!customStart || !customEnd))}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors ${
              exporting || (period === 'custom' && (!customStart || !customEnd))
                ? 'bg-gray-300 cursor-not-allowed'
                : exported
                ? 'bg-gray-900'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Export en cours...
              </>
            ) : exported ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Téléchargé !
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-5 h-5" />
                Télécharger CSV
              </>
            )}
          </button>
          {period === 'custom' && (!customStart || !customEnd) && (
            <p className="text-xs text-gray-700 mt-2 text-center">Sélectionnez les dates de début et fin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
