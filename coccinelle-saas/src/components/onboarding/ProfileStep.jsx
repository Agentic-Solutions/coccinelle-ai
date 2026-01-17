'use client';

import React, { useState, useEffect } from 'react';
import { INDUSTRIES } from '@/constants/industries';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function ProfileStep({ onNext, onBack, loading }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    company: '',
    industry: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile({
            name: data.user?.name || '',
            phone: data.tenant?.phone || '',
            company: data.tenant?.name || '',
            industry: data.tenant?.sector || data.tenant?.industry || '',
          });
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          company_name: profile.company,
          industry: profile.industry,
        }),
      });

      if (res.ok) {
        // Profil sauvegardé, passer à l'étape suivante
        onNext({ profileCompleted: true });
      } else {
        const error = await res.json();
        setMessage(`Erreur: ${error.error || error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      setMessage('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Complétez votre profil
        </h2>
        <p className="text-gray-600">
          Ces informations nous permettront de personnaliser votre expérience
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          {message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Votre nom complet *
        </label>
        <input
          type="text"
          name="name"
          value={profile.name}
          onChange={handleChange}
          placeholder="Ex: Jean Dupont"
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Téléphone principal *
        </label>
        <input
          type="tel"
          name="phone"
          value={profile.phone}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="Ex: 06 12 34 56 78"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de l'entreprise *
        </label>
        <input
          type="text"
          name="company"
          value={profile.company}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Secteur d'activité *
        </label>
        <select
          name="industry"
          value={profile.industry}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          required
        >
          <option value="">Sélectionnez votre secteur</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind.value} value={ind.value}>{ind.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-black rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          type="submit"
          disabled={saving || loading}
          className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Continuer →'}
        </button>
      </div>
    </form>
  );
}
