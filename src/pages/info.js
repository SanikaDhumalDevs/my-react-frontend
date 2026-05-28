import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

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
        
        // Target your Python server (5001) instead of the Node.js server (5000)
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

  const renderInfo = (text) =>
    text
      .split("\n\n")
      .filter((line) => line.trim() !== "")
      .map((line, index) => (
        <li 
          key={index} 
          className="p-4 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-300 leading-relaxed shadow-sm hover:border-purple-500/30 transition-colors flex items-start gap-3"
        >
          <span className="text-purple-400 mt-1">•</span>
          <span>{line.trim()}</span>
        </li>
      ));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-x-hidden font-sans flex flex-col items-center">
      
      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mt-10">
        
        {/* Title Section */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-10 text-center tracking-tight drop-shadow-sm">
          {medicineName ? `${medicineName} Info` : "Medicine Information"}
        </h1>

        {/* Content Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl min-h-[400px]">
          
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xl text-purple-300 animate-pulse font-medium">Fetching medical details...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-xl max-w-md">
                <span className="text-4xl mb-2 block">⚠️</span>
                <p className="text-red-400 font-bold text-lg">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-300 rounded-lg text-sm transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div>
              {info ? (
                <ul className="space-y-4">
                  {renderInfo(info)}
                </ul>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-500 italic text-lg">No information available for this medicine.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center pb-10">
           <button 
             onClick={() => window.history.back()}
             className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-500 shadow-lg hover:shadow-xl hover:-translate-y-1"
           >
             ← Go Back
           </button>
        </div>

      </div>
    </div>
  );
};

export default InfoPage;