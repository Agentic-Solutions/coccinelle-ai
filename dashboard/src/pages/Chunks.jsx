import { Layers } from 'lucide-react';

export default function Chunks() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Chunks</h1>
        <p className="text-sm text-gray-600">Visualisez et gérez les chunks de vos documents</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Interface en cours de développement</p>
      </div>
    </div>
  );
}
