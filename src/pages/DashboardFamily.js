import React, { useState, useEffect } from 'react';
// import './DashboardFamily.css'; // Removed: Replaced with Tailwind classes
import axios from "axios";

const DashboardFamily = () => {
  // --- STATE & LOGIC (UNCHANGED) ---
  const [familyAccountName, setFamilyAccountName] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMemberEmail, setSelectedMemberEmail] = useState('');
  const [warrantyEntries, setWarrantyEntries] = useState([]);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantyError, setWarrantyError] = useState(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [members, setMembers] = useState([""]);
  const [fetchError, setFetchError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [voices, setVoices] = useState([]);
  const [translatedText, setTranslatedText] = useState("");

  const getVoiceForLanguage = (langCode) => {
    if (!voices.length) return null;
    const matchingVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith(langCode)
    );
    return matchingVoices[0] || null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let email = localStorage.getItem("userEmail");
        if (!email) {
          const userJson = localStorage.getItem("user");
          if (userJson) {
            const user = JSON.parse(userJson);
            email = user?.email || null;
          }
        }
        if (!email) {
          setFetchError("Not logged in or missing userEmail in localStorage.");
          return;
        }

        const url = `http://localhost:5000/api/family/${encodeURIComponent(email)}`;
        const response = await axios.get(url);

        setFamilyAccountName(response.data.familyAccountName || '');

        // Combine admin + members here:
        const adminEmail = response.data.adminEmail;
        const adminName = response.data.adminName;

        const combinedMembers = [];
        if (adminEmail) {
          combinedMembers.push({ name: adminName || 'Admin', email: adminEmail });
        }
        if (response.data.members && response.data.members.length) {
          combinedMembers.push(...response.data.members);
        }

        setFamilyMembers(combinedMembers);
        setIsAdmin(!!response.data.isAdmin);
        setFetchError(null);
      } catch (error) {
        setFetchError(
          error?.response?.status === 404
            ? "Dashboard data not found (404). Check if user email exists in DB."
            : (error?.message || "Error fetching dashboard data.")
        );
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
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
    if (!familyAccountName) return;

    const fetchNotifications = async () => {
      setNotifLoading(true);
      setNotifError(null);

      try {
        const response = await axios.get(`http://localhost:5000/api/notifications/${encodeURIComponent(familyAccountName)}`);
        setNotifications(response.data.notifications || []);
      } catch (error) {
        setNotifError('Failed to load notifications.');
        setNotifications([]);
      } finally {
        setNotifLoading(false);
      }
    };

    fetchNotifications();
  }, [familyAccountName]);

  useEffect(() => {
    if (!selectedMemberEmail) {
      setWarrantyEntries([]);
      return;
    }

    const fetchWarrantyEntries = async () => {
      setWarrantyLoading(true);
      setWarrantyError(null);

      try {
        const response = await axios.get(`http://localhost:5000/api/entries/by-email/${encodeURIComponent(selectedMemberEmail)}`);
        setWarrantyEntries(response.data.entries || []);
      } catch (error) {
        setWarrantyError('Failed to load warranty entries.');
        setWarrantyEntries([]);
      } finally {
        setWarrantyLoading(false);
      }
    };

    fetchWarrantyEntries();
  }, [selectedMemberEmail]);

  const handleAddMemberField = () => setMembers([...members, ""]);

  const handleMemberChange = (index, value) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const readNotificationsAloud = async () => {
    if (notifications.length === 0) {
      alert("No notifications to read.");
      return;
    }

    // Combine notifications into one string
    const combinedText = notifications
      .map(
        (notif, idx) =>
          `Notification ${idx + 1}: The product ${notif.productName} will expire within next 3 days on ${new Date(notif.expiryDate).toLocaleDateString()}, for user ${notif.email}`
      )
      .join(". ");

    let translated = combinedText;

    if (selectedLanguage !== "en") {
      try {
        const res = await axios.post("http://localhost:5001/translate", {
          text: combinedText,
          target: selectedLanguage,
        });
        translated = res.data.translatedText;
      } catch (err) {
        console.error("Translation failed:", err);
        alert("Could not translate notifications.");
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
        { text: translated, lang: selectedLanguage },
        { responseType: "blob" }
      );

      const audioBlob = new Blob([res.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error("Speech playback failed:", err);
      alert("Speech playback failed.");
    }
  };

  const handleSubmitMembers = async () => {
    if (members.some(m => m.trim() === "")) {
      alert("Please fill all member emails");
      return;
    }

    try {
      const payload = {
        familyAccountName,
        members: members.map(m => String(m).trim().toLowerCase())
      };
      const res = await axios.post("http://localhost:5000/api/family/add-members", payload, { timeout: 5000 });

      if (res.status === 201 || res.status === 200) {
        const newMembers = res.data || [];
        const newMemberObjects = newMembers.map(n => {
          if (typeof n === 'string') return { name: '', email: n };
          return { name: n.name || '', email: n.email || n };
        });
        setFamilyMembers(prev => [...prev, ...newMemberObjects]);
        alert("Members added successfully!");
        setMembers([""]);
        setShowAddMemberForm(false);
      } else {
        alert("Failed to add members.");
      }
    } catch (error) {
      console.error("Error adding members:", error);
      alert("Error adding members. Check server logs and Network tab.");
    }
  };

  // --- STYLING & JSX ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-x-hidden font-sans">
      
      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Section */}
      <header className="relative z-10 max-w-7xl mx-auto mb-10 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-6 tracking-tight">
          👨‍👩‍👧‍👦 Welcome {familyAccountName || '—'} Family
        </h2>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => (window.location.href = '/add-entry')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
          >
             ➕ Add Entry
          </button>

          {isAdmin && !showAddMemberForm && (
            <button 
              onClick={() => setShowAddMemberForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
            >
               ➕ Add Member
            </button>
          )}

          <button 
            onClick={() => {
              localStorage.removeItem('userEmail'); localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Error Message */}
      {fetchError && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-center text-red-300 font-bold">
          {fetchError}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        
        {/* Card 1: Family Members */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-full">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">👥 Family Members</h3>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px]">
            {familyMembers.length === 0 ? (
              <p className="text-slate-500 italic">No family members yet.</p>
            ) : (
              familyMembers.map((member, idx) => (
                <div key={idx} className="p-4 bg-slate-950/50 border border-slate-700 rounded-xl flex justify-between items-center group">
                  <div>
                    <h4 className="text-white font-medium">{member.name || `Member ${idx + 1}`}</h4>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete member ${member.email}?`)) {
                          try {
                            const res = await axios.delete('http://localhost:5000/api/family/delete-member', {
                              data: { familyAccountName, memberEmail: member.email }
                            });
                            if (res.status === 200) {
                              setFamilyMembers(prev => prev.filter(m => m.email !== member.email));
                              alert('Member deleted successfully.');
                            } else {
                              alert('Failed to delete member.');
                            }
                          } catch (error) {
                            console.error('Delete member error:', error);
                            alert('Error deleting member.');
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Notifications */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-1">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">🔔 Notifications</h3>
            
            <div className="flex items-center gap-2">
              <select
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>

              <button
                onClick={readNotificationsAloud}
                className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                title="Speak Notifications"
              >
                🔊
              </button>
            </div>
          </div>

          {notifLoading && <p className="text-slate-400 animate-pulse">Loading notifications...</p>}
          {notifError && <p className="text-red-400">{notifError}</p>}
          
          {!notifLoading && notifications.length === 0 && (
             <p className="text-slate-500 italic">No warranty expiries within next 3 days.</p>
          )}

          {translatedText && (
            <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm font-medium">
              {translatedText}
            </div>
          )}

          <ul className="space-y-3 max-h-[400px] overflow-y-auto">
            {notifications.map((notif, idx) => (
              <li key={idx} className="p-3 bg-red-900/10 border border-red-500/30 text-red-200 rounded-lg text-sm">
                <span className="font-bold text-white block mb-1">{notif.email}</span>
                The product <em className="text-red-300">{notif.productName}</em> will expire within next 3 days on <strong className="text-white">{new Date(notif.expiryDate).toLocaleDateString()}</strong>.
              </li>
            ))}
          </ul>
        </div>

        {/* Card 3: Warranty Vault (Takes full width on tablet/desktop mostly) */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-2 xl:col-span-1 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📦 Warranty Vault</h3>

          <select
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-purple-500 outline-none"
            value={selectedMemberEmail}
            onChange={(e) => setSelectedMemberEmail(e.target.value)}
          >
            <option value="">Select a Member to View Entries</option>
            {familyMembers.map((member, idx) => (
              <option key={idx} value={member.email}>
                {member.name || `Member ${idx + 1}`} ({member.email})
              </option>
            ))}
          </select>

          {warrantyLoading && <p className="text-slate-400 animate-pulse">Loading entries...</p>}
          {warrantyError && <p className="text-red-400">{warrantyError}</p>}

          {!warrantyLoading && !warrantyError && selectedMemberEmail && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              {warrantyEntries.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No entries found for this member.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 uppercase text-xs font-bold tracking-wider">
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {warrantyEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 text-sm">
                        <td className="p-3 text-white font-medium">{entry.itemName || '—'}</td>
                        <td className="p-3 text-slate-300 capitalize">{entry.category || '—'}</td>
                        <td className="p-3 text-slate-400">
                          {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal (Shown only if Admin) */}
      {showAddMemberForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            
            <h3 className="text-xl font-bold text-white mb-6">Add Family Members</h3>
            
            <div className="space-y-3 mb-6">
              {members.map((m, i) => (
                <input
                  key={i}
                  type="email"
                  placeholder={`Member ${i + 1} Email`}
                  value={m}
                  onChange={(e) => handleMemberChange(i, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              ))}
              <button 
                onClick={handleAddMemberField}
                className="text-sm text-purple-400 hover:text-purple-300 font-bold underline"
              >
                + Add Another Member
              </button>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleSubmitMembers}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all"
              >
                Submit
              </button>
              <button 
                onClick={() => setShowAddMemberForm(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning if non-admin tries to access form (based on original logic) */}
      {showAddMemberForm && !isAdmin && (
         <div className="fixed bottom-4 right-4 bg-red-900 border border-red-500 text-white px-6 py-3 rounded-xl shadow-xl z-50">
           Only family admin can add members.
         </div>
      )}

    </div>
  );
};

export default DashboardFamily;