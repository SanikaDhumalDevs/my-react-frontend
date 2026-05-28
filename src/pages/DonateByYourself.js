import React, { useState } from "react";
import axios from "axios";

const DonateByYourself = () => {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetchNGOs = async () => {
    if (!city || !country) {
      alert("Please enter both city and country");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Make sure this matches your backend port (usually 5000 or 8080)
      const response = await axios.post("https://my-node-backend-gold.vercel.app/api/donate/nearby", { city, country });
      setResults(response.data);
    } catch (error) {
      console.error("Error fetching NGOs:", error);
      alert("Failed to fetch donation centers. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-6 relative overflow-hidden font-sans">
      
      {/* Decorative Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-4 tracking-tight">
            Donate By Yourself
          </h1>
          <p className="text-slate-400 text-lg">
            Find nearby NGOs and donation centers to make a difference directly.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl mb-12 max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            <input
              type="text"
              placeholder="Enter City (e.g. Mumbai)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full md:w-1/3 bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-5 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
            />
            <input
              type="text"
              placeholder="Enter Country (e.g. India)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full md:w-1/3 bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-5 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
            />
            <button
              onClick={handleFetchNGOs}
              disabled={loading}
              className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search Centers"}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="inline-block bg-purple-900/20 border border-purple-500/30 px-6 py-2 rounded-full mb-4">
                <h2 className="text-xl font-bold text-purple-300 uppercase tracking-wide">
                  📍 Results for {results.city}, {results.country}
                </h2>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-6 pl-2 border-l-4 border-purple-500">
              Nearby Donation Centers
            </h3>

            {Array.isArray(results.donationCenters) && results.donationCenters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.donationCenters.map((center, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors shadow-lg group flex flex-col h-full"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                      <strong className="text-lg text-white group-hover:text-purple-400 transition-colors">
                        {center.name}
                      </strong>
                    </div>
                    
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-grow">
                      {center.address}
                    </p>
                    
                    {/* Google Maps Button */}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.name + " " + center.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto w-full py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2"
                    >
                       <span>🗺️</span> Get Directions
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-lg">
                   No specific donation centers found in this area.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonateByYourself;