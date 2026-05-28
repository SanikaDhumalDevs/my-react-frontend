import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const StreakPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { email, name } = location.state || {};

  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastSpokenDaysRef = useRef(null);

  useEffect(() => {
    if (!email || !name) {
      navigate('/dashboard');
      return;
    }

    const fetchStreak = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`https://my-node-backend-gold.vercel.app/api/streak/${email}`);
        setStreakData(res.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch streak:', err);
        setError('Could not load streak data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, [email, name, navigate]);

  const resetStreak = async () => {
    try {
      // send email in the request body (not as URL param)
      await axios.post("https://my-node-backend-gold.vercel.app/api/streak/reset", { email });
      
      // fetch the updated streak after reset
      const res = await axios.get(`https://my-node-backend-gold.vercel.app/api/streak/${email}`);
      setStreakData(res.data);
    } catch (err) {
      console.error('Error resetting streak:', err);
    }
  };

  // Speak function
  const speakMessage = (message) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Speak streak reminder whenever gapDaysLeft changes
  useEffect(() => {
    if (!streakData) return;
    const { gapDaysLeft } = streakData;
    if (gapDaysLeft > 0 && lastSpokenDaysRef.current !== gapDaysLeft) {
      const message = `Hey user! Add a product in the next ${gapDaysLeft} day${gapDaysLeft > 1 ? 's' : ''} to keep your streak alive`;
      const triggerSpeech = () => {
        speakMessage(message);
        lastSpokenDaysRef.current = gapDaysLeft;
        document.body.dataset.interacted = true;
        document.removeEventListener('click', triggerSpeech);
      };
      if (document.body.dataset.interacted) speakMessage(message);
      else document.addEventListener('click', triggerSpeech, { once: true });
    }
  }, [streakData]);

  // --- LOGIC ENDS HERE ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-purple-400 animate-pulse text-xl font-bold">
        Loading streak data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-500 text-xl font-bold">
        {error}
      </div>
    );
  }

  if (!streakData) return null;

  const { currentStreak = 0, gapDaysLeft = 5 } = streakData;
  const totalDaysToShow = 10; // always 10 circles

  const timeline = Array.from({ length: totalDaysToShow }, (_, idx) => {
    const day = idx + 1;
    let className = "";
    
    if (day <= currentStreak) {
      // Completed Days (Green Glow)
      className = "bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border-transparent scale-110";
    } else if (day > currentStreak && day <= currentStreak + gapDaysLeft) {
      // Warning Days (Orange Pulse)
      className = "bg-gradient-to-br from-orange-400 to-amber-600 text-white animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)] border-transparent";
    } else {
      // Future Days (Grey)
      className = "bg-slate-900 border border-slate-700 text-slate-600";
    }

    return { day, className };
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome, {name}!</h1>
          <p className="text-slate-500 text-sm font-mono bg-slate-950/50 inline-block px-3 py-1 rounded-full border border-slate-800">
            {email}
          </p>
        </div>

        {/* Streak Counter */}
        <div className="my-10">
          <div className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 drop-shadow-lg flex items-center justify-center gap-4">
            <span className="text-6xl">🔥</span> {currentStreak}
          </div>
          <p className="text-slate-400 uppercase tracking-widest font-bold mt-2 text-sm">Current Streak Days</p>
        </div>

        {/* Timeline Circles */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {timeline.map((item) => (
            <div
              key={item.day}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${item.className}`}
              title={`Day ${item.day}`}
            >
              {item.day}
            </div>
          ))}
        </div>

        {/* Status Message */}
        {gapDaysLeft > 0 ? (
          <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl mb-8">
            <p className="text-orange-400 font-medium text-lg">
              Add a product in the next <strong className="text-orange-300 text-xl">{gapDaysLeft}</strong>{' '}
              day{gapDaysLeft > 1 ? 's' : ''} to keep your streak alive!
            </p>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-6">
              <p className="text-red-400 font-bold text-lg">
                💔 Streak broken! Don't give up, start a new one today.
              </p>
            </div>
            <button 
              onClick={resetStreak}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
            >
              Reset Streak
            </button>
          </div>
        )}

        <p className="text-slate-500 italic text-sm">
          "Consistency is the key to success. Keep going!" 👏
        </p>
      </div>
    </div>
  );
};

export default StreakPage;