'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Clock, DollarSign, Calendar, User, Hash } from 'lucide-react';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';
const API_KEY = 'demo-key-12345';

interface CallDetail {
  id: string;
  call_id: string;
  vapi_call_id: string;
  status: string;
  duration_seconds: number;
  cost_usd: string;
  prospect_name: string;
  phone_number: string;
  appointment_created: number;
  created_at: string;
  transcript: string;
  summary: string;
}

export default function CallDetailPage() {
  const params = useParams();
  const callId = params.callId as string;
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCallDetail() {
      try {
        const response = await fetch(`${API_URL}/api/v1/vapi/calls/${callId}`, {
          headers: { 'x-api-key': API_KEY }
        });
        const data = await response.json();
        
        if (data.success && data.call) {
          setCall(data.call);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    }

    if (callId) {
      fetchCallDetail();
    }
  }, [callId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Appel non trouvé</h2>
          <p className="text-gray-600 mb-6">L'appel {callId} n'existe pas dans la base de données.</p>
          <Link 
            href="/dashboard/appels"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Retour aux appels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Link 
          href="/dashboard/appels"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 inline-flex transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux appels
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Détails de l'Appel</h1>
          <p className="text-gray-600">Informations complètes et transcription</p>
        </div>

        {/* Statut Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            call.status === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <Phone className="w-4 h-4" />
            {call.status === 'completed' ? 'Appel terminé' : 'Appel échoué'}
          </span>
        </div>

        {/* Informations principales */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'appel</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow 
              icon={<Hash className="w-5 h-5 text-gray-500" />}
              label="ID Interne"
              value={call.id}
            />
            <InfoRow 
              icon={<Phone className="w-5 h-5 text-gray-500" />}
              label="ID VAPI"
              value={call.vapi_call_id || 'N/A'}
            />
            <InfoRow 
              icon={<User className="w-5 h-5 text-gray-500" />}
              label="Prospect"
              value={call.prospect_name || 'Inconnu'}
            />
            <InfoRow 
              icon={<Phone className="w-5 h-5 text-gray-500" />}
              label="Téléphone"
              value={call.phone_number || 'N/A'}
            />
            <InfoRow 
              icon={<Clock className="w-5 h-5 text-gray-500" />}
              label="Durée"
              value={`${call.duration_seconds} secondes (${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')})`}
            />
            <InfoRow 
              icon={<DollarSign className="w-5 h-5 text-gray-500" />}
              label="Coût"
              value={`$${call.cost_usd} USD`}
            />
            <InfoRow 
              icon={<Calendar className="w-5 h-5 text-gray-500" />}
              label="RDV créé"
              value={call.appointment_created === 1 ? '✅ Oui' : '❌ Non'}
              highlight={call.appointment_created === 1}
            />
            <InfoRow 
              icon={<Calendar className="w-5 h-5 text-gray-500" />}
              label="Date de l'appel"
              value={new Date(call.created_at).toLocaleString('fr-FR', {
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            />
          </div>
        </div>

        {/* Résumé (si disponible) */}
        {call.summary && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé de l'appel</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{call.summary}</p>
            </div>
          </div>
        )}

        {/* Transcription */}
        {call.transcript ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcription complète</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{call.transcript}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcription</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-500">Aucune transcription disponible pour cet appel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className={`font-medium ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
