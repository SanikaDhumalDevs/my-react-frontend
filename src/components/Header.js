import React from 'react';
// import './header.css'; // REMOVED: Replaced with Tailwind
import { Link, useLocation } from 'react-router-dom';

function Header() {
  const location = useLocation();

  // Define paths where header should be hidden (LOGIC KEPT INTACT)
  const hideHeaderRoutes = ['/dashboard', '/dashboard-family','/donate-via-platform'];

  // If current path matches, don't show the header
  if (hideHeaderRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* Logo with Gradient Text */}
        <div className="text-xl md:text-2xl font-bold tracking-tight">
          <Link to="/" className="text-white hover:opacity-90 transition-opacity">
            Smart Warranty <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Vault</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6 md:gap-8">
          <Link 
            to="/" 
            className="text-sm font-medium text-slate-400 hover:text-purple-400 transition-colors"
          >
            Home
          </Link>
          
          <Link 
            to="/login" 
            className="text-sm font-medium text-slate-400 hover:text-purple-400 transition-colors"
          >
            Login
          </Link>
          
          <Link 
            to="/register" 
            className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg shadow-purple-900/20 transition-all transform hover:scale-105"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;