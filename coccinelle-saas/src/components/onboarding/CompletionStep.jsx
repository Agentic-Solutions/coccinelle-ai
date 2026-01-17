'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Phone, Mail, MessageSquare, BookOpen } from 'lucide-react';

export default function CompletionStep({ onComplete }) {
  const router = useRouter();

  const handleComplete = () => {
    // Appeler la fonction de complétion de la page parente si elle existe
    if (onComplete) {
      onComplete();
    } else {
      // Fallback si onComplete n'est pas fourni
      localStorage.setItem('onboarding_completed', 'true');
      router.push('/dashboard');
    }
  };

  return (
    <div className="text-center py-12">
      {/* Icône de succès */}
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>

      {/* Titre */}
      <h2 className="text-3xl font-bold text-black mb-2">
        Félicitations !
      </h2>
      <p className="text-gray-600 mb-8 max-w-lg mx-auto">
        Votre compte Coccinelle.AI est prêt. Vous pouvez maintenant configurer votre assistant et vos canaux de communication.
      </p>

      {/* Prochaines étapes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-8 max-w-2xl mx-auto text-left">
        <h3 className="font-bold text-black mb-4 text-center">Prochaines étapes recommandées :</h3>

        <div className="space-y-4">
          <StepCard
            icon={<Phone className="w-5 h-5 text-black" />}
            title="Configurez votre canal téléphone"
            description="Paramétrez votre assistant vocal pour gérer les appels entrants"
            link="/dashboard/settings/channels/phone"
          />

          <StepCard
            icon={<BookOpen className="w-5 h-5 text-black" />}
            title="Enrichissez votre base de connaissance"
            description="Ajoutez vos documents pour que l'assistant réponde avec précision"
            link="/dashboard/knowledge"
          />

          <StepCard
            icon={<MessageSquare className="w-5 h-5 text-black" />}
            title="Activez d'autres canaux (SMS, Email, WhatsApp)"
            description="Communiquez avec vos clients sur tous les canaux"
            link="/dashboard/settings/channels"
          />
        </div>
      </div>

      {/* Bouton principal */}
      <button
        onClick={handleComplete}
        className="px-8 py-4 bg-black text-white text-lg font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        Accéder au Dashboard →
      </button>

      <p className="mt-6 text-sm text-gray-500">
        Besoin d'aide ? <a href="mailto:support@coccinelle.ai" className="text-black hover:underline font-medium">Contactez le support</a>
      </p>
    </div>
  );
}

function StepCard({ icon, title, description, link }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-black mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
