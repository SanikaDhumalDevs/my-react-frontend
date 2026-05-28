import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"; 
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const userEmail = location.state?.email || localStorage.getItem("email") || "";
  const username = location.state?.username || localStorage.getItem("username") || "";

  const [entries, setEntries] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [voices, setVoices] = useState([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [isCarbonModalOpen, setIsCarbonModalOpen] = useState(false);
  const [monthlyEmission, setMonthlyEmission] = useState(0);
  const [historyData, setHistoryData] = useState([]);  // stores past months emissions
  const [showHistory, setShowHistory] = useState(false); // toggle chart visibility
  
  // aiSuggestions holds the JSON objects returned by Gemini
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    // Load speech synthesis voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  useEffect(() => {
    // Initialize SpeechRecognition once
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // Listen in English by default
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript.toLowerCase();
      console.log("Speech recognized:", speechResult);

      // Detect language from spoken command
      if (speechResult.includes("hindi") || speechResult.includes("हिंदी")) {
        setSelectedLanguage("hi");
      } else if (speechResult.includes("marathi") || speechResult.includes("मराठी")) {
        setSelectedLanguage("mr");
      } else {
        setSelectedLanguage("en");
      }

      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      alert("Speech recognition error: " + event.error);
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // Call readAloud when selectedLanguage changes (and not listening)
  useEffect(() => {
    if (!listening) {
      readAloud();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  useEffect(() => {
    if (userEmail) localStorage.setItem("email", userEmail);
    if (username) localStorage.setItem("username", username);

    const fetchEntries = async () => {
      try {
        const response = await axios.get(`https://my-node-backend-gold.vercel.app//api/dashboard?email=${userEmail}`);
        const allEntries = response.data.entries || [];
        setEntries(allEntries);
        
        // --- Build previous months history ---
        const now2 = new Date();
        const currentMonth1 = now2.getMonth();
        const currentYear1 = now2.getFullYear();

        const grouped = {};

        allEntries.forEach((entry) => {
          const dateStr = entry.purchaseDate||entry.createdAt ;
          if (!dateStr) return;
          const d = new Date(dateStr);
          const y = d.getFullYear();
          const m = d.getMonth();

          // Skip current month
          if (y === currentYear1 && m === currentMonth1) return;

          const key = `${y}-${m}`;
          if (!grouped[key]) {
            grouped[key] = { year: y, month: m, total: 0 };
          }
          grouped[key].total += Number(entry.totalEmission || 0);
        });

        // Convert object → sorted array
        const historyArray = Object.values(grouped)
          .map((obj) => {
            const d = new Date(obj.year, obj.month, 1);
            return {
              monthLabel: d.toLocaleString("default", { month: "short", year: "numeric" }),
              total: obj.total,
              sortKey: obj.year * 12 + obj.month,
            };
          })
          .sort((a, b) => a.sortKey - b.sortKey);

        setHistoryData(historyArray);

        // Calculate current month's total emission
        const now1 = new Date();
        const currentMonth = now1.getMonth();
        const currentYear = now1.getFullYear();

        const monthEntries = allEntries.filter(entry => {
          const entryDate = new Date(entry.purchaseDate);
          return (
            entryDate.getMonth() === currentMonth &&
            entryDate.getFullYear() === currentYear
          );
        });

        const totalEmission = monthEntries.reduce(
          (sum, entry) => sum + (entry.totalEmission || 0),
          0
        );

        setMonthlyEmission(totalEmission);
        
        // Email logic (9-10AM)
        const now = new Date();
        const hour = now.getHours();

        const lastSentDate = localStorage.getItem("lastEmailSentDate");
        const todayDateString = now.toDateString();

        const isBetween9and10 = hour >= 9 && hour < 10;

        const expiringItems = allEntries.filter((entry) => {
          const expiryDate = new Date(entry.expiryDate);
          return (
            expiryDate >= new Date() &&
            expiryDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
            ["product", "medicine", "food"].includes(entry.category?.toLowerCase())
          );
        });

        if (
          isBetween9and10 &&
          lastSentDate !== todayDateString &&
          expiringItems.length > 0
        ) {
          await axios.post("https://my-node-backend-gold.vercel.app//api/notify-expiry", {
            to: userEmail,
          });
          localStorage.setItem("lastEmailSentDate", todayDateString);
          console.log("✅ Email sent for expiring items.");
        } else {
          console.log("⏳ No email sent (either time window missed, already sent today, or no items).");
        }
      } catch (error) {
        console.error("Error fetching dashboard entries:", error);
      }
    };
    if (userEmail) fetchEntries();
  }, [userEmail, username]);

  const getExpiringEntries = (category) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = new Date(today);
    upcoming.setDate(today.getDate() + 3);
    upcoming.setHours(23, 59, 59, 999);

    return entries.filter((entry) => {
      const expiry = new Date(entry.expiryDate);
      return (
        entry.category?.toLowerCase() === category.toLowerCase() &&
        expiry >= today &&
        expiry <= upcoming
      );
    });
  };
  
  // Upgraded: POST request sending entries array directly to Port 5001
  const fetchAiSuggestions = async () => {
    if (entries.length === 0) {
      setAiSuggestions([]);
      return;
    }

    try {
      setLoadingAi(true);
      const res = await axios.post("http://localhost:5001/suggestions", {
        entries: entries
      });
      
      const suggestionsData = res.data.suggestions;
      if (Array.isArray(suggestionsData)) {
        setAiSuggestions(suggestionsData);
      } else {
        setAiSuggestions([]);
      }
      setLoadingAi(false);
    } catch (err) {
      console.error("Error fetching AI suggestions:", err);
      setAiSuggestions([]);
      setLoadingAi(false);
    }
  };

  const getVoiceForLanguage = (langCode) => {
    if (!voices.length) return null;
    const matchingVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith(langCode)
    );
    return matchingVoices[0] || null;
  };

  const formatDateToSpoken = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "long" });
    return `${day} ${month} ${year}`;
  };

  const readAloud = async () => {
    const productsExpiring = getExpiringEntries("product");
    const medicinesExpiring = getExpiringEntries("medicine");
    const foodsExpiring = getExpiringEntries("food");

    const messages = [];

    if (productsExpiring.length > 0) {
      const productNames = productsExpiring
        .map((p) => `${p.itemName} expires on ${formatDateToSpoken(p.expiryDate)}`)
        .join(", ");
      messages.push(`Products: ${productsExpiring.length} expiring in next 3 days. ${productNames}`);
    }

    if (medicinesExpiring.length > 0) {
      const medicineNames = medicinesExpiring
        .map((m) => `${m.itemName} expires on ${formatDateToSpoken(m.expiryDate)}`)
        .join(", ");
      messages.push(`Medicines: ${medicinesExpiring.length} expiring in next 3 days. ${medicineNames}`);
    }

    if (foodsExpiring.length > 0) {
      const foodNames = foodsExpiring
        .map((f) => `${f.itemName} expires on ${formatDateToSpoken(f.expiryDate)}`)
        .join(", ");
      messages.push(`Food Items: ${foodsExpiring.length} expiring in next 3 days. ${foodNames}`);
    }

    const finalMessage = messages.join(". ");
    if (!finalMessage) {
      return;
    }

    let translated = finalMessage;

    if (selectedLanguage !== "en") {
      try {
        const res = await axios.post("http://localhost:5001/translate", {
          text: finalMessage,
          target: selectedLanguage,
        });
        translated = res.data.translatedText;
      } catch (err) {
        console.error("Translation failed", err);
        alert("Could not translate text.");
        return;
      }
    }

    setTranslatedText(translated);

    const selectedVoice = getVoiceForLanguage(selectedLanguage);

    if (selectedVoice && selectedLanguage === "en") {
      const utterance = new SpeechSynthesisUtterance(translated);
      utterance.voice = selectedVoice;
      window.speechSynthesis.speak(utterance);
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5001/speak",
        {
          text: translated,
          lang: selectedLanguage,
        },
        { responseType: "blob" }
      );

      const audioBlob = new Blob([res.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error("Python TTS playback failed:", err);
      alert("Speech playback failed.");
    }
  };

  const handleDeleteExpiredEntries = async () => {
    if (!userEmail) {
      alert("User email not found. Please login again.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to DELETE all expired entries for your account? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const delRes = await axios.post(
        `https://my-node-backend-gold.vercel.app//api/entries/delete-expired`,
        { email: userEmail }
      );

      if (delRes.status === 200) {
        const deletedCount = delRes.data?.deletedCount ?? null;
        if (deletedCount !== null) {
          alert(`Deleted ${deletedCount} expired entr${deletedCount === 1 ? "y" : "ies"}.`);
        } else {
          alert("Expired entries deleted successfully.");
        }

        try {
          const refreshed = await axios.get(
            `https://my-node-backend-gold.vercel.app//api/dashboard?email=${encodeURIComponent(userEmail)}`
          );
          setEntries(refreshed.data.entries || []);
        } catch (fetchErr) {
          console.error("Failed to refresh entries after delete:", fetchErr);
        }
      } else {
        alert("Failed to delete expired entries. Server responded with status: " + delRes.status);
        console.error("Delete response:", delRes);
      }
    } catch (err) {
      console.error("Error deleting expired entries:", err);
      alert("Error deleting expired entries. Check console/network tab for details.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleAddEntry = () => {
    navigate("/add-entry", { state: { email: userEmail, username } });
  };

  const handleManageExpiringProducts = () => {
    navigate("/manage-expiring-products", {
      state: { email: userEmail, username }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-x-hidden font-sans">
      
      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Section */}
      <header className="relative z-10 max-w-7xl mx-auto mb-10 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-6 tracking-tight">
          Welcome, {username || "User"}!
        </h2>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={handleAddEntry} 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
          >
             ➕ Add Entry
          </button>

          <button
            onClick={handleDeleteExpiredEntries}
            className="flex items-center gap-2 px-5 py-3 bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all hover:scale-105"
            title="Delete expired entries"
          >
             🗑️ Clean Up
          </button>

          <button
            onClick={() => navigate("/streak", { state: { email: userEmail, name: username } })}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/50 hover:bg-blue-600 hover:text-white rounded-xl font-bold transition-all hover:scale-105"
            title="View Streak"
          >
             🔥 Streak
          </button>

          <button 
            onClick={handleManageExpiringProducts}
            className="flex items-center gap-2 px-5 py-3 bg-orange-600/20 text-orange-400 border border-orange-500/50 hover:bg-orange-600 hover:text-white rounded-xl font-bold transition-all hover:scale-105"
            title="Manage Expiring"
          >
             ⌛ Manage
          </button>

          <button
            onClick={() => {
              setIsCarbonModalOpen(true);
              fetchAiSuggestions(); 
            }}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white rounded-xl font-bold transition-all hover:scale-105"
            title="Carbon Footprint"
          >
             🌍 Footprint
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Language & Voice Controls */}
      <div className="relative z-10 max-w-7xl mx-auto bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <label htmlFor="languageSelect" className="text-slate-400 font-semibold flex items-center gap-2">
            🌐 <span className="hidden md:inline">Language:</span>
          </label>
          <select
            id="languageSelect"
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={listening}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={readAloud}
            className="p-3 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
            title="Read aloud"
            disabled={listening}
          >
            🔊
          </button>

          <button
            onClick={() => {
              if (recognitionRef.current) {
                setListening(true);
                recognitionRef.current.start();
              }
            }}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${
              listening 
                ? "bg-red-500 text-white animate-pulse" 
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            disabled={listening}
          >
            🎙️ {listening ? "Listening..." : "Voice Command"}
          </button>
        </div>
      </div>

      {translatedText && (
        <div className="max-w-7xl mx-auto mb-8 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl text-center text-purple-300 font-medium">
          {translatedText}
        </div>
      )}

      {/* Info Cards Section */}
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {["product", "medicine", "food"].map((type) => {
          const items = getExpiringEntries(type);
          const count = items.length;
          // Determine color based on type
          let borderColor = "hover:border-blue-500/50";
          let icon = "📦";
          if (type === "medicine") { borderColor = "hover:border-red-500/50"; icon = "💊"; }
          if (type === "food") { borderColor = "hover:border-green-500/50"; icon = "🍎"; }

          return (
            <div key={type} className={`bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl transition-all duration-300 ${borderColor} group`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                  {icon} {type}s
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${count > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                  {count} Expiring
                </span>
              </div>
              
              <ul className="space-y-3">
                {items.length > 0 ? (
                  items.map((entry, index) => (
                    <li key={index} className="text-sm text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800 flex justify-between">
                      <span className="truncate max-w-[60%] font-medium text-slate-300">{entry.itemName}</span>
                      <span className="text-slate-500">{new Date(entry.expiryDate).toLocaleDateString()}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-600 text-sm italic">No items expiring soon.</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Entries Table Section */}
      <div className="relative z-10 max-w-7xl mx-auto bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-xl font-bold text-white">Your Inventory</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 uppercase text-xs font-bold tracking-wider">
                <th className="p-4">Type</th>
                <th className="p-4">Name</th>
                <th className="p-4">Expiry</th>
                <th className="p-4">Warranty</th>
                <th className="p-4">Created</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.length > 0 ? (
                entries.map((entry, index) => {
                  const isProduct = entry.category?.toLowerCase() === "product";
                  const formattedWarranty = isProduct && entry.purchaseDate && entry.warrantyPeriod
                      ? new Date(new Date(entry.purchaseDate).setMonth(new Date(entry.purchaseDate).getMonth() + parseInt(entry.warrantyPeriod))).toLocaleDateString()
                      : "—";
                  const formattedExpiry = !isProduct && entry.expiryDate
                      ? new Date(entry.expiryDate).toLocaleDateString()
                      : "—";

                  // Status Logic
                  let status = "—";
                  let statusClass = "text-slate-500";
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  let targetDate = null;

                  if (isProduct && entry.purchaseDate && entry.warrantyPeriod) {
                    targetDate = new Date(entry.purchaseDate);
                    targetDate.setMonth(targetDate.getMonth() + parseInt(entry.warrantyPeriod));
                  } else if (!isProduct && entry.expiryDate) {
                    targetDate = new Date(entry.expiryDate);
                  }

                  if (targetDate) {
                    const diff = targetDate - today;
                    if (diff < 0) { status = "Expired"; statusClass = "text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded"; }
                    else if (diff <= 3 * 24 * 60 * 60 * 1000) { status = "Expiring Soon"; statusClass = "text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded"; }
                    else { status = "Good"; statusClass = "text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded"; }
                  }

                  return (
                    <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-slate-300 capitalize">{entry.category || "—"}</td>
                      <td className="p-4 text-white font-medium">
                        {entry.itemName || "—"}
                        {entry.category?.toLowerCase() === "medicine" && entry.itemName && (
                          <a href={`/info?name=${encodeURIComponent(entry.itemName)}`} className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline">info</a>
                        )}
                      </td>
                      <td className="p-4 text-slate-400">{formattedExpiry}</td>
                      <td className="p-4 text-slate-400">{formattedWarranty}</td>
                      <td className="p-4 text-slate-400 text-sm">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="p-4 text-sm"><span className={statusClass}>{status}</span></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 italic">No entries found. Click "Add Entry" to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Carbon Footprint Modal */}
      {isCarbonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsCarbonModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                Carbon Footprint
              </h1>
              <button onClick={() => setIsCarbonModalOpen(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="p-6 space-y-8">
              {/* Total Emission Card */}
              <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-center">
                <h2 className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Total Emission (This Month)</h2>
                <p className="text-4xl font-extrabold text-emerald-400">{monthlyEmission.toFixed(2)} <span className="text-lg text-slate-500">kg CO₂e</span></p>
              </div>

              {/* History Toggle */}
              <div className="text-center">
                <button 
                  onClick={() => setShowHistory((prev) => !prev)}
                  className="text-purple-400 hover:text-purple-300 font-medium underline transition-colors"
                >
                  {showHistory ? "Hide Previous History" : "📊 View Previous History Graph"}
                </button>
              </div>

              {/* Graph */}
              {showHistory && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 h-72">
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="monthLabel" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                          formatter={(value) => [`${value.toFixed(2)} kg CO₂e`, "Emission"]} 
                        />
                        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No historical data available yet.</div>
                  )}
                </div>
              )}

              {/* AI Suggestions - UPDATED UI */}
              <div className="bg-indigo-900/10 border border-indigo-500/30 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-indigo-300 mb-6 flex items-center gap-2">
                  🤖 Smart AI Insights
                </h3>
                
                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-400 animate-pulse">Analyzing carbon impact...</p>
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <div className="space-y-6">
                    {aiSuggestions.map((item, idx) => (
                      <div key={idx} className="bg-slate-950/50 border border-slate-700 rounded-xl p-5 hover:border-indigo-500/50 transition-colors">
                        {/* Item Header */}
                        <h4 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2 capitalize">
                          {item.item}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Causes */}
                          <div>
                            <h5 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                              ⚠️ Causes
                            </h5>
                            <p className="text-slate-400 text-sm leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                              {item.causes}
                            </p>
                          </div>

                          {/* Effects */}
                          <div>
                            <h5 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                              🌍 Impact
                            </h5>
                            <p className="text-slate-400 text-sm leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                              {item.effects}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Tips */}
                          <div>
                            <h5 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                              💡 Tips
                            </h5>
                            <ul className="space-y-2">
                              {item.tips?.map((tip, tIdx) => (
                                <li key={tIdx} className="text-slate-400 text-sm flex items-start gap-2">
                                  <span className="text-emerald-500/50 mt-1">●</span> {tip}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Replacements */}
                          <div>
                            <h5 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                              🔄 Replacements
                            </h5>
                            <ul className="space-y-2">
                              {item.replacements?.map((rep, rIdx) => (
                                <li key={rIdx} className="text-slate-400 text-sm flex items-start gap-2">
                                  <span className="text-blue-500/50 mt-1">●</span> {rep}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">
                    No specific high-emission items found to analyze this month.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 text-right bg-slate-900 sticky bottom-0 z-10">
              <button 
                onClick={() => setIsCarbonModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;