// App.js
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
// import './App.css'; // REMOVED: Replaced with Tailwind

import Register from './pages/Register';
import Login from './pages/Login';
import DonateByYourself from './pages/DonateByYourself';

import Dashboard from './pages/Dashboard';
import DashboardFamily from './pages/DashboardFamily';
import AddEntry from './pages/AddEntry';
import StreakPage from './components/StreakPage';
import Consume from './pages/Consume';
import InfoPage from './pages/info';
import ManageExpiringProducts from './pages/ManageExpiringProducts';
import DonateViaPlatform from "./pages/DonateViaPlatform";

function Home() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-6 bg-slate-950 overflow-hidden">
      
      {/* Decorative Background Effects */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl space-y-8">
        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          Welcome to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
            Smart Warranty Vault
          </span>
        </h2>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Track your warranties, food, and medicines. Monitor expiration dates, reduce waste, and manage your inventory—all in one intelligent, secure vault.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link 
            to="/login"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-full shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
          >
            Get Started
          </Link>
          <Link 
            to="/register"
            className="px-8 py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold rounded-full transition-all hover:scale-105"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}


function App() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30">
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-family" element={<DashboardFamily />} />
        <Route path="/add-entry" element={<AddEntry />} />
        <Route path="/streak" element={<StreakPage/>}/>
        <Route path="/consume" element={<Consume/>}/>
        <Route path="/donate-yourself" element={<DonateByYourself/>}/>
        
        {/* existing routes */}
        <Route path="/donate-via-platform" element={<DonateViaPlatform />} />
        <Route path="/info" element={<InfoPage/>}/>
        <Route path="/manage-expiring-products" element={<ManageExpiringProducts/>}/>
      </Routes>

      {/* Logic to hide footer on specific pages */}
      {location.pathname !== '/dashboard-family'  && 
       location.pathname !== '/dashboard' && 
       location.pathname !== '/consume' && 
       location.pathname !== '/donate-via-platform' &&
        <Footer />
      }
    </div>
  );
}

export default App;