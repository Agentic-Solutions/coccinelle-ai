import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <div>
      <div className="flex items-center mb-6">
        <BarChart3 className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
      </div>
      <div className="bg-white shadow sm:rounded-lg p-6">
        <p className="text-gray-500">Analytics dashboard coming soon...</p>
      </div>
    </div>
  );
}
