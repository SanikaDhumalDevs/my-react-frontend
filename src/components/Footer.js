import React from 'react';
// import './footer.css'; // REMOVED: Replaced with Tailwind

function Footer() {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Smart Warranty Vault. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;