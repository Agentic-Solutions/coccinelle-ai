'use client';

import { useState } from 'react';
import DemoModal from '@/components/DemoModal';

export default function DemoButton() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDemo(true)}
        className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        Voir la démo
      </button>
      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </>
  );
}
