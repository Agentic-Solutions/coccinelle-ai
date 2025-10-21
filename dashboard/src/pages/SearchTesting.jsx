import { Search } from 'lucide-react';

export default function SearchTesting() {
  return (
    <div>
      <div className="flex items-center mb-6">
        <Search className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Search Testing</h2>
      </div>
      <div className="bg-white shadow sm:rounded-lg p-6">
        <p className="text-gray-500">Search interface coming soon...</p>
      </div>
    </div>
  );
}
