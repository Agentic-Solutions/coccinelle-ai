import { Users2 } from 'lucide-react';

export default function QueuesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users2 className="w-6 h-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Files d&apos;attente</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Users2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Cette fonctionnalité arrive prochainement.</p>
      </div>
    </div>
  );
}
