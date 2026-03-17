'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, MapPin, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { isDemoMode, mockAppointments } from '../../../../lib/mockData';
import { useToast } from '../../../../hooks/useToast';
import ActionToastContainer from '@/components/ActionToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Appointment {
  id: string;
  tenant_id: string;
  prospect_id: string;
  agent_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
  prospect_name?: string;
  prospect_phone?: string;
  prospect_email?: string;
  agent_name?: string;
}

export default function RdvDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [params.id]);

  const fetchAppointment = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const found = mockAppointments.find((a: Appointment) => a.id === params.id);
        setAppointment(found || null);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/appointments/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.appointment) {
        setAppointment(data.appointment);
      } else {
        setAppointment(null);
      }
    } catch (error) {
      console.error('Erreur chargement RDV:', error);
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!appointment) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Statut mis à jour : ${getStatusLabel(newStatus)}`);
        setAppointment({ ...appointment, status: newStatus });
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Planifié',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Absent'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rendez-vous...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Rendez-vous introuvable</h2>
          <p className="text-gray-600 mb-6">Ce rendez-vous n&apos;existe pas ou a été supprimé.</p>
          <Link href="/dashboard/rdv" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            <ArrowLeft size={16} />
            Retour aux rendez-vous
          </Link>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(appointment.scheduled_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <ActionToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/rdv">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} className="hidden sm:block" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Détail du rendez-vous</h1>
              <p className="text-sm text-gray-600">
                {scheduledDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info principale */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Informations</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                  {getStatusLabel(appointment.status)}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {scheduledDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Heure</p>
                    <p className="font-medium text-gray-900">
                      {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {appointment.duration_minutes && ` (${appointment.duration_minutes} min)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Prospect</p>
                    <p className="font-medium text-gray-900">{appointment.prospect_name || 'Non renseigné'}</p>
                    {appointment.prospect_phone && (
                      <p className="text-sm text-gray-500">{appointment.prospect_phone}</p>
                    )}
                  </div>
                </div>

                {appointment.agent_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Agent</p>
                      <p className="font-medium text-gray-900">{appointment.agent_name}</p>
                    </div>
                  </div>
                )}

                {appointment.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-gray-900">{appointment.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-2">
                {appointment.status === 'scheduled' && (
                  <button
                    onClick={() => updateStatus('confirmed')}
                    disabled={updating}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Confirmer
                  </button>
                )}
                {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                  <>
                    <button
                      onClick={() => updateStatus('completed')}
                      disabled={updating}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Marquer terminé
                    </button>
                    <button
                      onClick={() => updateStatus('no_show')}
                      disabled={updating}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 text-sm font-medium rounded-lg hover:bg-orange-200 disabled:opacity-50"
                    >
                      <AlertCircle size={16} />
                      Absent
                    </button>
                    <button
                      onClick={() => updateStatus('cancelled')}
                      disabled={updating}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 text-sm font-medium rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Créé le</h3>
              <p className="text-sm text-gray-600">
                {new Date(appointment.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
