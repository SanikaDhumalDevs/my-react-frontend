import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

// Style mapping based on standard bullet emoji headers
const cardStyles = {
  "📌": {
    borderColor: "border-pink-500/30 hover:border-pink-500/60",
    glowColor: "shadow-pink-500/5",
    iconBg: "bg-pink-500/10",
    textColor: "text-pink-400",
    headerColor: "text-pink-200"
  },
  "⚙️": {
    borderColor: "border-indigo-500/30 hover:border-indigo-500/60",
    glowColor: "shadow-indigo-500/5",
    iconBg: "bg-indigo-500/10",
    textColor: "text-indigo-400",
    headerColor: "text-indigo-200"
  },
  "⚠️": {
    borderColor: "border-amber-500/30 hover:border-amber-500/60",
    glowColor: "shadow-amber-500/5",
    iconBg: "bg-amber-500/10",
    textColor: "text-amber-400",
    headerColor: "text-amber-200"
  },
  "🛡️": {
    borderColor: "border-cyan-500/30 hover:border-cyan-500/60",
    glowColor: "shadow-cyan-500/5",
    iconBg: "bg-cyan-500/10",
    textColor: "text-cyan-400",
    headerColor: "text-cyan-200"
  },
  "♻️": {
    borderColor: "border-emerald-500/40 hover:border-emerald-500/80",
    glowColor: "shadow-emerald-500/10",
    iconBg: "bg-emerald-500/10 animate-pulse",
    textColor: "text-emerald-400",
    headerColor: "text-emerald-200"
  }
};

const InfoPage = () => {
  const location = useLocation();
  const medicineName =
    location?.state?.medicineName ||
    new URLSearchParams(location.search).get("name") ||
    "";

  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!medicineName) return;

    const fetchMedicineInfo = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          "http://localhost:5001/medicine-info",
          { medicineName }
        );
        setInfo(response.data.info);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch medicine info. Please try again.");
        setLoading(false);
      }
    };

    fetchMedicineInfo();
  }, [medicineName]);

  // Parser: Separates raw AI text into structured objects
  const parseInfoCards = (text) => {
    if (!text) return [];
    
    return text
      .split("\n\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const trimmed = line.trim();
        const emoji = trimmed.substring(0, 2).trim(); // Extracts the leading emoji (e.g. 📌, ♻️)
        
        let header = "Information";
        let body = trimmed;

        // Extract header if there is a colon (e.g. "📌 WHAT IT IS: Description")
        if (trimmed.includes(":")) {
          const splitIndex = trimmed.indexOf(":");
          header = trimmed.substring(2, splitIndex).trim();
          body = trimmed.substring(splitIndex + 1).trim();
        }

        const styles = cardStyles[emoji] || {
          borderColor: "border-slate-800",
          glowColor: "shadow-none",
          iconBg: "bg-slate-800",
          textColor: "text-purple-400",
          headerColor: "text-white"
        };

        return { emoji, header, body, styles };
      });
  };

  const parsedCards = parseInfoCards(info);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-x-hidden font-sans flex flex-col items-center pb-20">
      
      {/* Glow Effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[35rem] h-[35rem] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mt-10">
        
        {/* Title Block */}
        <div className="text-center mb-12">
          <div className="inline-block bg-purple-900/10 border border-purple-500/20 px-4 py-1 rounded-full mb-3 text-sm text-purple-300 font-semibold tracking-wide uppercase">
             Health & Sustainability Portal
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 tracking-tight drop-shadow-sm">
            {medicineName ? `${medicineName} Analysis` : "Medicine Directory"}
          </h1>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/40 border border-slate-900 rounded-3xl backdrop-blur-md">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-xl text-purple-300 animate-pulse font-medium mt-6">Consulting AI Medical Guide...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-slate-900/40 border border-slate-900 rounded-3xl backdrop-blur-md p-6">
            <div className="p-8 bg-red-950/20 border border-red-500/30 rounded-2xl max-w-md">
              <span className="text-5xl mb-4 block">⚠️</span>
              <p className="text-red-400 font-bold text-lg mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-300 rounded-xl text-sm font-semibold transition-all shadow-lg"
              >
                Retry Search
              </button>
            </div>
          </div>
        )}

        {/* Data Cards Grid */}
        {!loading && !error && (
          <div className="space-y-6">
            
            {parsedCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Map first 4 cards into a 2x2 responsive grid */}
                {parsedCards.slice(0, 4).map((card, idx) => (
                  <div 
                    key={idx} 
                    className={`bg-slate-900/60 backdrop-blur border ${card.styles.borderColor} rounded-2xl p-6 shadow-xl ${card.styles.glowColor} transition-all duration-300 hover:-translate-y-1 flex flex-col`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${card.styles.iconBg} flex items-center justify-center text-2xl`}>
                        {card.emoji}
                      </div>
                      <h3 className={`text-lg font-bold uppercase tracking-wider ${card.styles.headerColor}`}>
                        {card.header}
                      </h3>
                    </div>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed flex-grow">
                      {card.body}
                    </p>
                  </div>
                ))}

                {/* Map the 5th Eco-Disposal card as a Full Width Banner across the bottom */}
                {parsedCards[4] && (
                  <div 
                    className={`col-span-1 md:col-span-2 bg-gradient-to-r from-slate-900/90 to-emerald-950/20 backdrop-blur border ${parsedCards[4].styles.borderColor} rounded-2xl p-6 md:p-8 shadow-2xl ${parsedCards[4].styles.glowColor} transition-all duration-300 hover:border-emerald-400 flex flex-col md:flex-row items-start md:items-center gap-6 mt-2`}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${parsedCards[4].styles.iconBg} flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-emerald-950/40`}>
                      {parsedCards[4].emoji}
                    </div>
                    <div>
                      <h3 className={`text-xl font-black uppercase tracking-widest ${parsedCards[4].styles.headerColor} mb-2 flex items-center gap-2`}>
                        {parsedCards[4].header} <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase">Sustainable Choice</span>
                      </h3>
                      <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        {parsedCards[4].body}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-24 bg-slate-900/40 rounded-3xl border border-slate-900">
                <p className="text-slate-500 italic text-xl">No scientific details available for this compound.</p>
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4 pt-8">
              <button 
                onClick={() => window.history.back()}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-all border border-slate-850 hover:border-slate-700 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                ← Go Back
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default InfoPage;