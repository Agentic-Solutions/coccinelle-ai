'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect vers la page unifiee dans conversations/appels
export default function AppelsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/conversations/appels');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Redirection...</p>
    </div>
  );
}
