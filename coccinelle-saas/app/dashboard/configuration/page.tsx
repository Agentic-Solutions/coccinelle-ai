'use client';

import Link from 'next/link';
import { Bot, Phone, Mail, MessageSquare } from 'lucide-react';

export default function ConfigurationPage() {
  const sections = [
    {
      title: 'Assistant IA',
      description: 'Configuration de votre assistant intelligent, types d\'agents et base de connaissances',
      href: '/dashboard/configuration/assistant',
      icon: Bot,
      color: 'blue'
    },
    {
      title: 'Canaux de communication',
      description: 'Configuration de vos canaux (téléphone, SMS, WhatsApp, email)',
      href: '/dashboard/configuration/channels',
      icon: Phone,
      color: 'green'
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
        <p className="text-gray-600 mt-2">
          Configurez votre assistant IA et vos canaux de communication
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="block bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-${section.color}-50`}>
                  <Icon className={`w-6 h-6 text-${section.color}-600`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
