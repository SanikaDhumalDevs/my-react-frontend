import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const AddEntry = () => {
  const [activeTab, setActiveTab] = useState('product');
  const [formData, setFormData] = useState({
    email: localStorage.getItem('email') || '',
    name: '',
    purchaseDate: '',
    warrantyPeriod: '',
    expiryDate: '',
    bill: null,
    city: '',
    country: '',
    quantity: 1,
    unit: 'kg',
    totalEmission: '', 
  });

  const [message, setMessage] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrQueue, setOcrQueue] = useState([]); // Holds multiple items extracted by AI

  const {
    transcript,
    listening: isListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'bill' && files && files[0]) {
      setFormData((prev) => ({ ...prev, bill: files[0] }));
      runOCR(files[0]); 
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Auto-calculate single item emission factor
  useEffect(() => {
    const fetchEmissionFactor = async () => {
      if (!formData.name || !formData.quantity || !formData.unit) return;

      try {
        const queryParams = new URLSearchParams({
          itemName: formData.name,
          quantity: formData.quantity,
          unit: formData.unit,
        }).toString();

        const response = await fetch(`https://my-node-backend-gold.vercel.app/api/emission-factor/calculate?${queryParams}`);
        const data = await response.json();

        if (response.ok && data?.totalEmission !== undefined) {
          setFormData((prev) => ({
            ...prev,
            totalEmission: data.totalEmission.toFixed(2),
          }));
        } else {
          setFormData((prev) => ({ ...prev, totalEmission: '' }));
        }
      } catch (err) {
        console.error("Emission factor fetch error:", err);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchEmissionFactor();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.name, formData.quantity, formData.unit]);

  // Run OCR upload targeting Flask Python server
  const runOCR = async (file) => {
    setOcrLoading(true);
    setMessage('');
    setOcrQueue([]);
    const formDataOCR = new FormData();
    formDataOCR.append("file", file);

    try {
      const response = await fetch("http://localhost:5001/ocr", {
        method: "POST",
        body: formDataOCR,
      });

      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        console.log("Structured AI OCR Array Result:", data);
        
        // Add checked status to all items so user can select/deselect
        const itemsWithSelection = data.map((item) => ({
          ...item,
          checked: true,
          totalEmission: "" // Will calculate emission per item dynamically
        }));

        setOcrQueue(itemsWithSelection);
        setMessage(`AI Bill Scanning complete! Detected ${data.length} items.`);

        // Trigger emission calculation for each item in the queue
        calculateQueueEmissions(itemsWithSelection);

      } else {
        setMessage(data.error || "Could not extract details from the image.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      setMessage("AI Scan Error: Check if your Python server is running.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Helper: Calculates emission factors for all items detected in the bill
  const calculateQueueEmissions = async (items) => {
    const updatedQueue = [...items];
    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      try {
        const queryParams = new URLSearchParams({
          itemName: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'piece',
        }).toString();

        const response = await fetch(`https://my-node-backend-gold.vercel.app/api/emission-factor/calculate?${queryParams}`);
        const data = await response.json();
        if (response.ok && data?.totalEmission !== undefined) {
          updatedQueue[i].totalEmission = data.totalEmission.toFixed(2);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setOcrQueue(updatedQueue);
  };

  const handleQueueCheck = (index) => {
    setOcrQueue((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, checked: !item.checked } : item))
    );
  };

  // Handles bulk submit for multiple items, or normal single submit
  // Handles bulk submit for multiple items, or normal single submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Submitting entries to Vault...");

    const itemsToSubmit = ocrQueue.length > 0 
      ? ocrQueue.filter(item => item.checked)
      : [{ ...formData, itemName: formData.name }];

    if (itemsToSubmit.length === 0) {
      setMessage("Please check at least one item to submit.");
      return;
    }

    try {
      let successCount = 0;

      // Loop and submit each item sequentially
      for (let i = 0; i < itemsToSubmit.length; i++) {
        const item = itemsToSubmit[i];
        const form = new FormData();
        
        form.append('email', formData.email);
        form.append('itemName', item.name || item.itemName); 
        form.append('city', formData.city);
        form.append('country', formData.country);
        form.append('purchaseDate', item.purchaseDate || formData.purchaseDate || '');
        form.append('category', activeTab); 
        form.append('quantity', parseFloat(item.quantity || formData.quantity)); 
        form.append('unit', item.unit || formData.unit);
        form.append('totalEmission', parseFloat(item.totalEmission) || 0); 

        // CRITICAL OPTIMIZATION: Only upload the heavy bill file for the first item in the list.
        // This prevents overloading Vercel with multiple concurrent image uploads.
        if (formData.bill && i === 0) {
          form.append('bill', formData.bill);
        }

        if (activeTab === 'product') {
          form.append('warrantyPeriod', item.warrantyPeriod || formData.warrantyPeriod || '');
        } else {
          form.append('expiryDate', item.expiryDate || formData.expiryDate || '');
        }

        const response = await fetch('https://my-node-backend-gold.vercel.app/api/entries/add', {
          method: 'POST',
          body: form,
        });

        if (response.ok) {
          successCount++;
        }
      }

      if (successCount === itemsToSubmit.length) {
        setMessage(`Success! Saved ${successCount} entries to your Vault.`);
        setOcrQueue([]); // Clear queue on success
      } else {
        setMessage(`Saved ${successCount} out of ${itemsToSubmit.length} entries. Some database connections may have timed out.`);
      }
    } catch (error) {
      console.error(error);
      setMessage('Network error. Some submissions may have failed.');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'en-IN' });
    }
  };

  // Voice recognition parsing logic (stays exactly the same)
  useEffect(() => {
    if (!transcript) return;
    let spokenText = transcript.toLowerCase().replace(/ at /g, '@').replace(/ dot /g, '.').replace(/ underscore /g, '_').replace(/ dash /g, '-').replace(/\s+/g, ' ');
    const wordToNumber = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

    const parseSpokenDate = (str) => {
      if (!str) return null;
      let cleaned = str.toLowerCase().replace(/(\d+)(st|nd|rd|th)/g, '$1').replace(/\bof\b/g, '').trim();
      const isoMatch = cleaned.match(/(\d{4})[-\s](\d{1,2})[-\s](\d{1,2})/);
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      const dmyMatch = cleaned.match(/(\d{1,2})[-\/\s](\d{1,2})[-\/\s](\d{2,4})/);
      if (dmyMatch) {
        let [_, d, m, y] = dmyMatch;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return null;
    };

    setFormData((prev) => {
      const updatedForm = { ...prev };
      const extractValue = (text, startKeyword, endKeywords) => {
        const index = text.indexOf(startKeyword);
        if (index === -1) return null;
        let after = text.substring(index + startKeyword.length).trim();
        let limitIndex = after.length;
        for (const keyword of endKeywords) {
          const kwIndex = after.indexOf(keyword);
          if (kwIndex !== -1 && kwIndex < limitIndex) limitIndex = kwIndex;
        }
        return after.substring(0, limitIndex).trim();
      };

      const controlKeywords = ['email', 'item', 'name', 'quantity', 'qty', 'unit', 'city', 'country', 'purchase date', 'purchase', 'warranty', 'expiry date', 'expiry', 'expires'];

      const emailVal = extractValue(spokenText, 'email is', controlKeywords) || extractValue(spokenText, 'email', controlKeywords);
      if (emailVal) updatedForm.email = emailVal.replace(/\s/g, '');

      const nameVal = extractValue(spokenText, 'item is', controlKeywords) || extractValue(spokenText, 'item', controlKeywords) || extractValue(spokenText, 'name is', controlKeywords) || extractValue(spokenText, 'name', controlKeywords);
      if (nameVal) updatedForm.name = nameVal;

      return updatedForm;
    });
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return <span className="text-white text-center mt-10 block">Voice recognition not supported.</span>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
        
        <h2 className="text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-8">
          Add New Entry
        </h2>

        {/* Custom Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
          {['product', 'medicine', 'food'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 rounded-lg font-bold text-sm transition-all duration-300 capitalize ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Main Manual Input Form (only visible if no OCR items are queued) */}
          {ocrQueue.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Email <span className="text-red-500">*</span></label>
                  <input 
                    type="email" name="email" placeholder="user@example.com" required 
                    onChange={handleChange} value={formData.email}
                    className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Item Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" name="name" placeholder="e.g. Laptop" required 
                    onChange={handleChange} value={formData.name}
                    className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Qty</label>
                    <input 
                      type="number" name="quantity" min="0.1" step="0.1" placeholder="1" required 
                      onChange={handleChange} value={formData.quantity}
                      className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Unit</label>
                    <select 
                      name="unit" onChange={handleChange} value={formData.unit} required
                      className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                      <option value="packet">packet</option>
                      <option value="piece">piece</option>
                      <option value="tablet">tablet</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Emission (kgCO₂e)</label>
                  <input 
                    type="text" name="totalEmission" value={formData.totalEmission} readOnly placeholder="Auto-calculated"
                    className="w-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold rounded-lg px-4 py-3 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">City <span className="text-red-500">*</span></label>
                    <input 
                      type="text" name="city" placeholder="City" required onChange={handleChange} value={formData.city}
                      className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Country <span className="text-red-500">*</span></label>
                    <input 
                      type="text" name="country" placeholder="Country" required onChange={handleChange} value={formData.country}
                      className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Purchase Date</label>
                  <input 
                    type="date" name="purchaseDate" onChange={handleChange} value={formData.purchaseDate}
                    className="w-full bg-slate-950/50 border border-slate-700 text-slate-400 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {activeTab === 'product' ? (
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Warranty (Months)</label>
                    <input 
                      type="number" name="warrantyPeriod" placeholder="e.g. 12" onChange={handleChange} value={formData.warrantyPeriod}
                      className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Expiry Date</label>
                    <input 
                      type="date" name="expiryDate" onChange={handleChange} value={formData.expiryDate}
                      className="w-full bg-slate-950/50 border border-slate-700 text-slate-400 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Upload Bill (AI Scan)</label>
                  <input 
                    type="file" name="bill" accept="image/*,application/pdf" onChange={handleChange}
                    className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Scanned Multi-Item Checklist Queue */}
          {ocrQueue.length > 0 && (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 animate-fade-in max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase text-purple-400 tracking-wider">AI Scanned Items Checklist</h3>
                <button 
                  type="button" 
                  onClick={() => setOcrQueue([])}
                  className="text-xs text-red-400 hover:underline"
                >
                  Clear Scanner List
                </button>
              </div>

              <div className="space-y-3">
                {ocrQueue.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                    <input 
                      type="checkbox" 
                      checked={item.checked} 
                      onChange={() => handleQueueCheck(index)}
                      className="w-5 h-5 accent-purple-500 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        Qty: {item.quantity} {item.unit} | {item.expiryDate ? `Expires: ${item.expiryDate}` : `Warranty: ${item.warrantyPeriod} months`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-emerald-400 font-bold block">
                        {item.totalEmission ? `${item.totalEmission} kg` : "calculating..."}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanning Animation */}
          {ocrLoading && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm text-center animate-pulse">
              🔍 AI Multimodal scanner translating and parsing items...
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-sm text-center font-bold ${message.includes('complete') || message.includes('success') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              {ocrQueue.length > 0 ? `✅ Submit ${ocrQueue.filter(i => i.checked).length} AI Scanned Items` : "✅ Submit Entry"}
            </button>
            
            {ocrQueue.length === 0 && (
              <button 
                type="button" 
                onClick={toggleListening}
                className={`p-3.5 rounded-xl font-bold border transition-all ${
                  isListening 
                    ? 'bg-red-500/20 text-red-500 border-red-500 animate-pulse' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Voice Autofill"
              >
                {isListening ? '🛑 Listening...' : '🎙️ Voice Fill'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddEntry;