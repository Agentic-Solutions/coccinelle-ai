import { ListTree } from 'lucide-react';

export default function IvrPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <ListTree className="w-6 h-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">IVR / SVI</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <ListTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Cette fonctionnalité arrive prochainement.</p>
      </div>
    </div>
  );
}
