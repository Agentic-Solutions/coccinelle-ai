'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import SectorDemoModal from './SectorDemoModal';
import { type ScenarioData } from './SectorHeroAnimation';

export default function SectorDemoButton({
  sectorName,
  scenario1,
  scenario2,
}: {
  sectorName: string;
  scenario1: ScenarioData;
  scenario2: ScenarioData;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg text-white bg-gray-900 hover:bg-gray-700 transition-colors"
      >
        Voir la d\u00e9mo {sectorName}
        <ArrowRight className="ml-2 w-5 h-5" />
      </button>

      <SectorDemoModal
        open={open}
        onClose={() => setOpen(false)}
        sectorName={sectorName}
        scenario1={scenario1}
        scenario2={scenario2}
      />
    </>
  );
}
