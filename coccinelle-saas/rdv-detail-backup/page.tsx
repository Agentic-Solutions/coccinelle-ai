'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText,
  XCircle,
  Edit,
  ArrowLeft,
  Trash2
} from 'lucide-react';

interface AppointmentDetail {
  id: string;
  tenant_id: string;
  prospect_id: string;
  agent_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  prospect_name?: string;
  prospect_phone?: string;
  prospect_email?: string;
  agent_name?: string;
  agent_email?: string;
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    appointment_date: '',
    appointment_time: '',
    status: '',
    notes: ''
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    fetchAppointmentDetail();
  }, [appointmentId]);

  const fetchAppointmentDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}`, {
        headers: { 'x-api-key': 'demo-key-12345' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
        setEditForm({
          appointment_date: data.appointment.appointment_date,
          appointment_time: data.appointment.appointment_time,
          status: data.appointment.status,
          notes: data.appointment.notes || ''
        });
      } else {
        alert('❌ Rendez-vous introuvable');
        router.push('/dashboard/rdv');
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      alert('❌ Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-key-12345'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        alert('✅ Rendez-vous mis à jour avec succès !');
        setShowEditModal(false);
        fetchAppointmentDetail();
      } else {
        alert('❌ Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  const deleteAppointment = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { 'x-api-key': 'demo-key-12345' }
      });

      if (response.ok) {
        alert('✅ Rendez-vous supprimé avec succès !');
        router.push('/dashboard/rdv');
      } else {
        alert('❌ Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no_show': 'bg-orange-100 text-orange-800'
    };
    
    const labels: { [key: string]: string } = {
      'scheduled': 'Planifié',
      'confirmed': 'Confirmé',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'no_show': 'Absent'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status] || badges.scheduled}`}>
        {labels[status] || status}
      </span>
    );
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
      <Icon className="text-gray-400 mt-1" size={20} />
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-base font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="mx-auto text-red-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rendez-vous introuvable</h2>
          <button
            onClick={() => router.push('/dashboard/rdv')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/rdv')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Retour à la liste
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Détails du rendez-vous</h1>
            <p className="text-gray-600 mt-1">ID: {appointment.id}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit size={20} />
              Modifier
            </button>
            <button
              onClick={deleteAppointment}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 size={20} />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        {getStatusBadge(appointment.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Informations du rendez-vous
          </h2>
          
          <div className="space-y-3">
            <InfoRow
              icon={Calendar}
              label="Date du rendez-vous"
              value={new Date(appointment.appointment_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
            
            <InfoRow
              icon={Clock}
              label="Heure du rendez-vous"
              value={appointment.appointment_time}
            />
            
            <InfoRow
              icon={Calendar}
              label="Créé le"
              value={new Date(appointment.created_at).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            />
            
            <InfoRow
              icon={Calendar}
              label="Dernière mise à jour"
              value={new Date(appointment.updated_at).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="text-green-600" size={24} />
              Prospect
            </h2>
            
            <div className="space-y-3">
              <InfoRow
                icon={User}
                label="Nom complet"
                value={appointment.prospect_name || 'N/A'}
              />
              
              {appointment.prospect_phone && (
                <InfoRow
                  icon={Phone}
                  label="Téléphone"
                  value={appointment.prospect_phone}
                />
              )}
              
              {appointment.prospect_email && (
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={appointment.prospect_email}
                />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="text-purple-600" size={24} />
              Agent immobilier
            </h2>
            
            <div className="space-y-3">
              <InfoRow
                icon={User}
                label="Nom de l'agent"
                value={appointment.agent_name || 'N/A'}
              />
              
              {appointment.agent_email && (
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={appointment.agent_email}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {appointment.notes && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="text-gray-600" size={24} />
            Notes
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Modifier le rendez-vous</h2>
            
            <form onSubmit={updateAppointment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.appointment_date}
                    onChange={(e) => setEditForm({...editForm, appointment_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                  <input
                    type="time"
                    required
                    value={editForm.appointment_time}
                    onChange={(e) => setEditForm({...editForm, appointment_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    required
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">Planifié</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                    <option value="no_show">Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes optionnelles..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
