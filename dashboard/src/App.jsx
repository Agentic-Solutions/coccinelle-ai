import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileText, Layers, Search, BarChart3, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Documents from './pages/Documents';
import Chunks from './pages/Chunks';
import SearchTesting from './pages/SearchTesting';
import Analytics from './pages/Analytics';

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: FileText, label: 'Documents' },
    { path: '/chunks', icon: Layers, label: 'Chunks' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 h-screen fixed">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">🐞 Coccinelle.AI</h1>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Version 1.18.0</p>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <div className={`md:hidden fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={() => setIsOpen(false)} />
        <aside className="relative w-64 bg-white h-full shadow-xl">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">🐞 Coccinelle.AI</h1>
            <button onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm rounded-md ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>
    </>
  );
}

function TopBar({ setIsSidebarOpen }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 fixed top-0 right-0 left-0 md:left-64 z-10">
      <div className="flex items-center justify-between h-full px-6">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden text-gray-600 hover:text-gray-900"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="flex-1" />

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-gray-500">API Online</span>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <TopBar setIsSidebarOpen={setIsSidebarOpen} />
        
        <main className="md:ml-64 pt-14">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Documents />} />
              <Route path="/chunks" element={<Chunks />} />
              <Route path="/search" element={<SearchTesting />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
