'use client';

import Link from 'next/link';
import { Bot, Phone, Mail, MessageSquare } from 'lucide-react';

export default function ConfigurationPage() {
  const sections = [
    {
      title: 'Assistant IA',
      description: 'Configuration de votre assistant intelligent, types d\'agents et base de connaissances',
      href: '/dashboard/sara',
      icon: Bot,
      bgClass: 'bg-blue-50',
      iconClass: 'text-blue-600'
    },
    {
      title: 'Canaux de communication',
      description: 'Configuration de vos canaux (telephone, SMS, WhatsApp, email)',
      href: '/dashboard/channels',
      icon: Phone,
      bgClass: 'bg-green-50',
      iconClass: 'text-green-600'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 pl-10 lg:pl-0">Configuration</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2 pl-10 lg:pl-0">
          Configurez votre assistant IA et vos canaux de communication
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="block bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:border-blue-500 hover:shadow-lg transition-all active:bg-gray-50"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`p-2.5 sm:p-3 rounded-lg ${section.bgClass} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${section.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                    {section.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
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
