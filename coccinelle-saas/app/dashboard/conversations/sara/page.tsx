'use client';

import { useState } from 'react';
import { Mic, Phone, Zap, Brain, Settings as SettingsIcon, Volume2, MessageSquare, Target, Clock } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';

interface VoiceConfig {
  voice: string;
  speed: number;
  pitch: number;
  language: string;
}

interface PersonalityConfig {
  tone: string;
  formality: string;
  enthusiasm: number;
}

interface QualificationCriteria {
  budget: boolean;
  timeline: boolean;
  location: boolean;
  propertyType: boolean;
  urgency: boolean;
}

export default function AssistantConfigPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'personality' | 'scripts' | 'qualification'>('voice');

  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    voice: 'fr-FR-DeniseNeural',
    speed: 1.0,
    pitch: 1.0,
    language: 'fr-FR'
  });

  const [personality, setPersonality] = useState<PersonalityConfig>({
    tone: 'professional',
    formality: 'formal',
    enthusiasm: 70
  });

  const [qualificationCriteria, setQualificationCriteria] = useState<QualificationCriteria>({
    budget: true,
    timeline: true,
    location: true,
    propertyType: true,
    urgency: true
  });

  const [script, setScript] = useState(`Bonjour ! Je suis Assistant, l'assistante vocale de {AGENCY_NAME}.

Je vous contacte concernant votre recherche immobilière. Pourriez-vous me confirmer que vous cherchez actuellement un bien ?

[ATTENDEZ REPONSE]

Parfait ! Pour mieux vous accompagner, j'aurais quelques questions :

1. Quel type de bien recherchez-vous ? (Appartement, maison, terrain)
2. Dans quel secteur géographique ?
3. Quel est votre budget approximatif ?
4. Pour quand souhaitez-vous emménager ?

[COLLECTE INFORMATIONS]

Excellent ! Je vais transmettre ces informations à nos agents qui vous rappelleront dans les 24h pour vous proposer des biens correspondant à vos critères.

Puis-je vous proposer un rendez-vous avec un de nos conseillers ?`);

  const voices = [
    { id: 'fr-FR-DeniseNeural', name: 'Denise (Féminin, Professionnel)', gender: 'female' },
    { id: 'fr-FR-HenriNeural', name: 'Henri (Masculin, Professionnel)', gender: 'male' },
    { id: 'fr-FR-AlainNeural', name: 'Alain (Masculin, Mature)', gender: 'male' },
    { id: 'fr-FR-CelesteNeural', name: 'Celeste (Féminin, Jeune)', gender: 'female' }
  ];

  const handleSave = () => {
    console.log('Saving Assistant configuration...', {
      voiceConfig,
      personality,
      qualificationCriteria,
      script
    });
    alert('Configuration de Assistant sauvegardée avec succès !');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Logo size={48} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration Assistant</h1>
              <p className="text-sm text-gray-600">Configurez votre agent IA vocal intelligent</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats en direct */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Phone className="w-5 h-5 text-green-600" />
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">Actif</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">Assistant</p>
            <p className="text-sm text-gray-600 mt-1">Agent IA en ligne</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Appels aujourd'hui</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">247</p>
            <p className="text-sm text-green-600 mt-1">↑ 12% vs hier</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Taux de qualification</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">78%</p>
            <p className="text-sm text-gray-600 mt-1">Leads qualifiés</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Durée moyenne</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">3m 24s</p>
            <p className="text-sm text-gray-600 mt-1">Par appel</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'voice'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                Voix & Audio
              </button>
              <button
                onClick={() => setActiveTab('personality')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'personality'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Brain className="w-4 h-4" />
                Personnalité
              </button>
              <button
                onClick={() => setActiveTab('scripts')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'scripts'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Scripts
              </button>
              <button
                onClick={() => setActiveTab('qualification')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'qualification'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Target className="w-4 h-4" />
                Qualification
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Voice Configuration */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration vocale</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voix
                      </label>
                      <select
                        value={voiceConfig.voice}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, voice: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vitesse de parole: {voiceConfig.speed}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={voiceConfig.speed}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, speed: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x (Lent)</span>
                        <span>1.0x (Normal)</span>
                        <span>2.0x (Rapide)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tonalité: {voiceConfig.pitch}
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={voiceConfig.pitch}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, pitch: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Grave</span>
                        <span>Normal</span>
                        <span>Aiguë</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 mb-3">
                        <span className="font-semibold">Astuce :</span> Testez différentes voix pour trouver celle qui correspond le mieux à votre marque.
                      </p>
                      <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Tester la voix
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personality Configuration */}
            {activeTab === 'personality' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personnalité de Assistant</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ton général
                      </label>
                      <select
                        value={personality.tone}
                        onChange={(e) => setPersonality({ ...personality, tone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="professional">Professionnel</option>
                        <option value="friendly">Amical</option>
                        <option value="expert">Expert</option>
                        <option value="casual">Décontracté</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Niveau de formalité
                      </label>
                      <select
                        value={personality.formality}
                        onChange={(e) => setPersonality({ ...personality, formality: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="formal">Formel (Vous)</option>
                        <option value="informal">Informel (Tu)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enthousiasme: {personality.enthusiasm}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={personality.enthusiasm}
                        onChange={(e) => setPersonality({ ...personality, enthusiasm: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Neutre</span>
                        <span>Modéré</span>
                        <span>Enthousiaste</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scripts Configuration */}
            {activeTab === 'scripts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Script de conversation</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Script principal
                      </label>
                      <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        rows={15}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Variables disponibles :</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li><code className="bg-white px-2 py-1 rounded">{'{AGENCY_NAME}'}</code> - Nom de votre agence</li>
                        <li><code className="bg-white px-2 py-1 rounded">{'{PROSPECT_NAME}'}</code> - Nom du prospect</li>
                        <li><code className="bg-white px-2 py-1 rounded">{'{AGENT_NAME}'}</code> - Nom de l'agent assigné</li>
                        <li><code className="bg-white px-2 py-1 rounded">{'{PROPERTY_TYPE}'}</code> - Type de bien recherché</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Qualification Configuration */}
            {activeTab === 'qualification' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Critères de qualification</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sélectionnez les informations que Assistant doit collecter pour qualifier un lead
                  </p>

                  <div className="space-y-3">
                    {Object.entries(qualificationCriteria).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setQualificationCriteria({ ...qualificationCriteria, [key]: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {key === 'budget' && 'Budget'}
                            {key === 'timeline' && 'Timeline / Échéance'}
                            {key === 'location' && 'Localisation souhaitée'}
                            {key === 'propertyType' && 'Type de bien'}
                            {key === 'urgency' && 'Niveau d\'urgence'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {key === 'budget' && 'Fourchette de prix du prospect'}
                            {key === 'timeline' && 'Quand le prospect souhaite emménager'}
                            {key === 'location' && 'Secteur géographique recherché'}
                            {key === 'propertyType' && 'Appartement, maison, terrain...'}
                            {key === 'urgency' && 'Urgence de la recherche'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <Zap className="w-5 h-5" />
            Sauvegarder la configuration
          </button>
        </div>
      </div>
    </div>
  );
}
