import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileText, Layers, Search, BarChart3 } from 'lucide-react';
import Documents from './pages/Documents';
import Chunks from './pages/Chunks';
import SearchTesting from './pages/SearchTesting';
import Analytics from './pages/Analytics';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: FileText, label: 'Documents' },
    { path: '/chunks', icon: Layers, label: 'Chunks' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary-600">Coccinelle.AI Dashboard</h1>
          </div>
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={<Documents />} />
            <Route path="/chunks" element={<Chunks />} />
            <Route path="/search" element={<SearchTesting />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
