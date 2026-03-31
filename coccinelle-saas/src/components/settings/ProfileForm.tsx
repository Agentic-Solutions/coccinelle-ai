'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { SECTORS } from '@/lib/sectors';
import { buildApiUrl } from '@/lib/config';

function handleExpiredSession(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('tenant');
  Cookies.remove('auth_token', { path: '/' });
  router.push('/login?expired=1');
}

export default function ProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
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
      const res = await fetch(buildApiUrl('/api/v1/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleExpiredSession(router);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const fullName = data.user?.name || '';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          setProfile({
            firstName: firstName,
            lastName: lastName,
            email: data.user?.email || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(buildApiUrl('/api/v1/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          company_name: profile.company,
          industry: profile.industry,
        }),
      });

      if (res.status === 401) {
        handleExpiredSession(router);
        return;
      }

      if (res.ok) {
        setMessage('Profil mis à jour avec succès');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.json();
        setMessage(`Erreur: ${error.error || error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      setMessage('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil utilisateur</h2>
        <p className="text-gray-600">Modifiez vos informations personnelles</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Profil') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prénom *
          </label>
          <input
            type="text"
            name="firstName"
            value={profile.firstName}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom *
          </label>
          <input
            type="text"
            name="lastName"
            value={profile.lastName}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={profile.email}
          disabled
          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
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
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          required
        >
          <option value="">Sélectionnez votre secteur</option>
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  );
}
