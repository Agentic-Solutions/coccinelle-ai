import React, { useState } from 'react';

const INDUSTRIES = [
  { value: 'real_estate', label: 'Immobilier', icon: '🏠' },
  { value: 'beauty', label: 'Beauté & Bien-être', icon: '💇' },
  { value: 'healthcare', label: 'Santé', icon: '⚕️' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'services', label: 'Services B2B', icon: '💼' }
];

export default function BusinessInfoStep({ initialData, onNext, loading }) {
  const [formData, setFormData] = useState({
    company_name: initialData?.company_name || '',
    industry: initialData?.industry || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    website: initialData?.website || ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.company_name) newErrors.company_name = 'Nom requis';
    if (!formData.industry) newErrors.industry = 'Secteur requis';
    if (!formData.phone) newErrors.phone = 'Téléphone requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext(formData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Parlez-nous de votre entreprise
      </h2>
      <p className="text-gray-600 mb-8">
        Ces informations nous permettront de personnaliser votre expérience.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom de votre entreprise *
          </label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.company_name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ex: Agence SuperImmo"
          />
          {errors.company_name && <p className="mt-1 text-sm text-red-600">{errors.company_name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secteur d'activité *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry.value}
                type="button"
                onClick={() => setFormData({ ...formData, industry: industry.value })}
                className={`p-4 border-2 rounded-lg text-left transition-all ${formData.industry === industry.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-2xl mb-1">{industry.icon}</div>
                <div className="font-medium text-gray-900">{industry.label}</div>
              </button>
            ))}
          </div>
          {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Téléphone principal *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="+33 1 23 45 67 89"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email de contact
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="contact@entreprise.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site web (optionnel)
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="https://www.entreprise.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          {loading ? 'Enregistrement...' : 'Continuer →'}
        </button>
      </form>
    </div>
  );
}
