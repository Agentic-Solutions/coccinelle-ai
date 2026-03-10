'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  description: string | null;
  price: number | null;
  color: string;
}

interface TenantInfo {
  name: string;
  industry: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  logo: string | null;
  color: string;
  website: string | null;
}

interface Slot {
  time: string;
  datetime: string;
  agent_id: string;
  agent_name: string;
}

type Step = 'type' | 'date' | 'slot' | 'form' | 'confirmation';

export default function BookingClient() {
  const params = useParams();
  const slug = params.slug as string;

  const [step, setStep] = useState<Step>('type');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // Selections
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ datetime: string; type_name: string | null } | null>(null);

  // Load tenant info
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API_URL}/api/v1/public/booking/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setTenant(data.tenant);
          setTypes(data.appointment_types || []);
          if (!data.appointment_types || data.appointment_types.length === 0) {
            setStep('date');
          }
        } else {
          setError(data.error || 'Entreprise introuvable');
        }
      })
      .catch(() => setError('Impossible de charger les informations'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load slots when date changes
  const loadSlots = useCallback((date: string) => {
    setSlots([]);
    const typeParam = selectedType ? `&type_id=${selectedType.id}` : '';
    fetch(`${API_URL}/api/v1/public/booking/${slug}/slots?date=${date}${typeParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSlots(data.slots || []);
        }
      })
      .catch(() => setSlots([]));
  }, [slug, selectedType]);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, loadSlots]);

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/public/booking/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          datetime: selectedSlot.datetime,
          type_id: selectedType?.id || null,
          agent_id: selectedSlot.agent_id || null
        })
      });

      const data = await res.json();

      if (data.success) {
        setConfirmation({
          datetime: data.datetime,
          type_name: data.type_name
        });
        setStep('confirmation');
      } else {
        setError(data.error || 'Erreur lors de la reservation');
      }
    } catch {
      setError('Erreur reseau. Veuillez reessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Date helpers
  const getNext30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDatetime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' a ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const themeColor = tenant?.color || '#1a1a1a';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page introuvable</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Retour a l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          {tenant?.logo ? (
            <img src={tenant.logo} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: themeColor }}>
              {tenant?.name?.charAt(0) || 'C'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{tenant?.name}</h1>
            <p className="text-sm text-gray-500">Prise de rendez-vous en ligne</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          {(['type', 'date', 'slot', 'form', 'confirmation'] as Step[]).map((s, i) => {
            const labels = ['Type', 'Date', 'Creneau', 'Coordonnees', 'Confirmation'];
            const stepOrder = ['type', 'date', 'slot', 'form', 'confirmation'];
            const currentIdx = stepOrder.indexOf(step);
            const isActive = i <= currentIdx;
            if (s === 'type' && types.length === 0) return null;
            return (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${isActive ? 'bg-gray-900' : 'bg-gray-200'}`} style={isActive ? { backgroundColor: themeColor } : {}} />
                <p className={`text-xs mt-1 ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {labels[i]}
                </p>
              </div>
            );
          })}
        </div>

        {error && step !== 'confirmation' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Select appointment type */}
        {step === 'type' && types.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Choisissez un type de rendez-vous</h2>
            <p className="text-gray-600 mb-6">Selectionnez le service qui vous convient</p>
            <div className="space-y-3">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedType(t); setStep('date'); }}
                  className="w-full text-left p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || themeColor }} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{t.duration_minutes} min</div>
                      {t.price != null && t.price > 0 && <div className="font-medium text-gray-900">{t.price} EUR</div>}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select date */}
        {step === 'date' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Choisissez une date</h2>
            {selectedType && (
              <p className="text-gray-600 mb-6">{selectedType.name} - {selectedType.duration_minutes} min</p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {getNext30Days().map(date => {
                const d = new Date(date + 'T12:00:00');
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <button
                    key={date}
                    onClick={() => { setSelectedDate(date); setStep('slot'); }}
                    disabled={isWeekend}
                    className={`p-3 rounded-lg text-center text-sm transition-colors ${
                      isWeekend
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-white border border-gray-200 hover:border-gray-900 text-gray-900'
                    }`}
                  >
                    {formatDateShort(date)}
                  </button>
                );
              })}
            </div>
            {types.length > 0 && (
              <button onClick={() => setStep('type')} className="mt-6 text-sm text-gray-500 hover:text-gray-700">
                ← Retour
              </button>
            )}
          </div>
        )}

        {/* Step 3: Select slot */}
        {step === 'slot' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Choisissez un creneau</h2>
            <p className="text-gray-600 mb-6">{formatDate(selectedDate)}</p>

            {slots.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500">Aucun creneau disponible pour cette date</p>
                <button onClick={() => setStep('date')} className="mt-4 text-sm text-gray-700 hover:text-gray-900 font-medium">
                  Choisir une autre date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => { setSelectedSlot(slot); setStep('form'); }}
                    className="p-3 bg-white border border-gray-200 rounded-lg text-center hover:border-gray-900 transition-colors"
                  >
                    <span className="text-lg font-semibold text-gray-900">{slot.time}</span>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setStep('date')} className="mt-6 text-sm text-gray-500 hover:text-gray-700">
              ← Retour
            </button>
          </div>
        )}

        {/* Step 4: Contact form */}
        {step === 'form' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vos coordonnees</h2>
            <p className="text-gray-600 mb-6">
              {selectedType?.name ? `${selectedType.name} - ` : ''}
              {formatDate(selectedDate)} a {selectedSlot?.time}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm resize-none"
                  placeholder="Informations complementaires..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: themeColor }}
              >
                {submitting ? 'Confirmation en cours...' : 'Confirmer le rendez-vous'}
              </button>
            </form>

            <button onClick={() => setStep('slot')} className="mt-6 text-sm text-gray-500 hover:text-gray-700">
              ← Retour
            </button>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 'confirmation' && confirmation && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: themeColor + '15' }}>
              <svg className="w-8 h-8" style={{ color: themeColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Rendez-vous confirme !</h2>
            <p className="text-gray-600 mb-6">
              Votre rendez-vous a bien ete enregistre.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md mx-auto text-left">
              {confirmation.type_name && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Type</span>
                  <p className="font-medium text-gray-900">{confirmation.type_name}</p>
                </div>
              )}
              <div className="mb-3">
                <span className="text-sm text-gray-500">Date et heure</span>
                <p className="font-medium text-gray-900">{formatDatetime(confirmation.datetime)}</p>
              </div>
              <div className="mb-3">
                <span className="text-sm text-gray-500">Contact</span>
                <p className="font-medium text-gray-900">{formData.first_name} {formData.last_name}</p>
                <p className="text-sm text-gray-600">{formData.phone}</p>
                {formData.email && <p className="text-sm text-gray-600">{formData.email}</p>}
              </div>
              {tenant?.name && (
                <div>
                  <span className="text-sm text-gray-500">Entreprise</span>
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                  {tenant.address && <p className="text-sm text-gray-600">{tenant.address}</p>}
                  {tenant.city && <p className="text-sm text-gray-600">{tenant.city}</p>}
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Vous recevrez une confirmation par SMS ou email.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        Propulse par <Link href="/" className="text-gray-500 hover:text-gray-700">coccinelle.ai</Link>
      </footer>
    </div>
  );
}
