'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Phone, User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { mockTenant, mockServices, mockSlots, isDemoMode } from '../../../lib/mockData';

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []; // Empty array - page will be rendered client-side for all tenantIds
}

interface TenantInfo {
  id: string;
  name: string;
  industry: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  logo: string | null;
  color: string;
  saraPhone: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  currency: string;
}

interface TimeSlot {
  agentId: string;
  agentName: string;
  datetime: string;
  available: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function BookingPage({ params }: { params: { tenantId: string } }) {
  const [step, setStep] = useState(1); // 1: Date, 2: Heure, 3: Service, 4: Info, 5: Confirmation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Données
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  // Sélections utilisateur
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Formulaire
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Confirmation
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    setLoading(true);
    try {
      // Mode démo pour localhost
      if (isDemoMode()) {
        setTenant(mockTenant);
        setServices(mockServices);
        setLoading(false);
        return;
      }

      // Charger infos tenant
      const tenantRes = await fetch(`${API_URL}/api/v1/public/${params.tenantId}/info`);
      const tenantData = await tenantRes.json();

      if (!tenantData.success) {
        setError('Établissement non trouvé');
        return;
      }

      setTenant(tenantData.tenant);

      // Charger services
      const servicesRes = await fetch(`${API_URL}/api/v1/public/${params.tenantId}/services`);
      const servicesData = await servicesRes.json();
      setServices(servicesData.services || []);

    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (date: string) => {
    try {
      // Mode démo pour localhost
      if (isDemoMode()) {
        setSlots(mockSlots);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/v1/public/${params.tenantId}/availability?date=${date}`
      );
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      console.error('Error loading availability:', err);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    loadAvailability(date);
    setStep(2);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    if (services.length > 0) {
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mode démo pour localhost
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simuler latence
        setAppointmentId('appt_demo_' + Date.now());
        setBookingConfirmed(true);
        setStep(5);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/v1/public/${params.tenantId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          datetime: selectedSlot?.datetime,
          agentId: selectedSlot?.agentId,
          serviceId: selectedService?.id,
          notes: formData.notes
        })
      });

      const data = await res.json();

      if (data.success) {
        setAppointmentId(data.appointmentId);
        setBookingConfirmed(true);
        setStep(5);
      } else {
        setError(data.error || 'Erreur lors de la réservation');
      }
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Générer les 30 prochains jours
  const getNext30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  if (loading && !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            {tenant?.logo && (
              <img src={tenant.logo} alt={tenant.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant?.name}</h1>
              <p className="text-gray-600">{tenant?.city}, {tenant?.country}</p>
            </div>
          </div>
        </div>

        {/* Progression */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {['Date', 'Heure', services.length > 0 ? 'Service' : null, 'Coordonnées', 'Confirmation'].filter(Boolean).map((label, index) => {
              const stepNum = index + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;

              return (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? `bg-black text-white` :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                  {index < (services.length > 0 ? 4 : 3) && (
                    <div className="w-12 h-0.5 bg-gray-200 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contenu selon step */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Choisissez une date
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {getNext30Days().map(date => {
                  const dateObj = new Date(date);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                  return (
                    <button
                      key={date}
                      onClick={() => handleDateSelect(date)}
                      className={`p-4 rounded-lg border-2 transition-all text-left hover:border-black ${
                        isWeekend ? 'bg-gray-50 text-gray-400' : 'border-gray-200 hover:shadow-md'
                      }`}
                      disabled={isWeekend}
                    >
                      <p className="text-sm font-medium">
                        {dateObj.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </p>
                      <p className="text-2xl font-bold">
                        {dateObj.getDate()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {dateObj.toLocaleDateString('fr-FR', { month: 'short' })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Choisissez un horaire
                </h2>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Modifier la date
                </button>
              </div>
              <p className="text-gray-600 mb-4">{formatDate(selectedDate)}</p>

              {slots.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucun créneau disponible pour cette date
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      className="p-3 rounded-lg border-2 border-gray-200 hover:border-black hover:shadow-md transition-all"
                    >
                      <p className="font-semibold">{formatTime(slot.datetime)}</p>
                      <p className="text-xs text-gray-600">{slot.agentName}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && services.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Choisissez une prestation</h2>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Retour
                </button>
              </div>
              <div className="space-y-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{service.duration_minutes} min</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {service.price} {service.currency}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Vos coordonnées</h2>
                <button
                  type="button"
                  onClick={() => setStep(services.length > 0 ? 3 : 2)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Retour
                </button>
              </div>

              {/* Résumé */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Récapitulatif</p>
                <p className="font-semibold">{formatDate(selectedDate)}</p>
                <p className="text-sm text-gray-600">
                  {selectedSlot && formatTime(selectedSlot.datetime)} - {selectedSlot?.agentName}
                </p>
                {selectedService && (
                  <p className="text-sm text-gray-600">
                    {selectedService.name} ({selectedService.duration_minutes} min)
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Des précisions sur votre demande..."
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Réservation en cours...' : 'Confirmer la réservation'}
                </button>
              </div>
            </form>
          )}

          {step === 5 && bookingConfirmed && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Réservation confirmée !</h2>
              <p className="text-gray-600 mb-6">
                Vous recevrez un SMS/Email de confirmation sous peu.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                <p className="text-sm text-gray-600 mb-3">Récapitulatif de votre rendez-vous</p>
                <div className="space-y-2">
                  <p className="font-semibold">{formatDate(selectedDate)}</p>
                  <p className="text-sm text-gray-600">
                    {selectedSlot && formatTime(selectedSlot.datetime)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Avec {selectedSlot?.agentName}
                  </p>
                  {selectedService && (
                    <p className="text-sm text-gray-600">
                      {selectedService.name}
                    </p>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-gray-500">Référence: {appointmentId}</p>
                  </div>
                </div>
              </div>

              {tenant?.saraPhone && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-900 mb-2">
                    Besoin de modifier votre RDV ?
                  </p>
                  <a
                    href={`tel:${tenant.saraPhone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler Sara
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Propulsé par <span className="font-semibold text-gray-900">Coccinelle.AI</span>
        </div>
      </div>
    </div>
  );
}
