

import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const AddEntry = () => {
  // Helper to get today's date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [activeTab, setActiveTab] = useState('product');
  const [formData, setFormData] = useState({
    email: localStorage.getItem('email') || '',
    name: '',
    purchaseDate: getTodayDateString(), // 1. Default to today's date to count for this month
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
  const [ocrText, setOcrText] = useState('');
  const [scannedItems, setScannedItems] = useState([]); // Holds multi-item scan arrays

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

  // Auto-fetch emission factor with Gemini fallback
  useEffect(() => {
    const fetchEmissionFactor = async () => {
      if (!formData.name || !formData.quantity || !formData.unit) return;

      try {
        const queryParams = new URLSearchParams({
          itemName: formData.name,
          quantity: formData.quantity,
          unit: formData.unit,
        }).toString();

        // 1. Attempt to fetch from the main Vercel database backend
        const response = await fetch(`https://my-node-backend-gold.vercel.app/api/emission-factor/calculate?${queryParams}`);
        const data = await response.json();

        if (response.ok && data?.totalEmission !== undefined && data.totalEmission !== null) {
          setFormData((prev) => ({
            ...prev,
            totalEmission: Number(data.totalEmission).toFixed(2),
          }));
        } else {
          // Fallback if item is not found in database or API returns error
          console.warn("Item not in database. Querying Gemini fallback...");
          await fetchGeminiEmission();
        }
      } catch (err) {
        console.error("Database fetch error, querying Gemini fallback...", err);
        await fetchGeminiEmission();
      }
    };

    // Helper function to call the Python Flask API to calculate via Gemini
    const fetchGeminiEmission = async () => {
      try {
        const response = await fetch("http://localhost:5001/calculate-emission", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            quantity: formData.quantity,
            unit: formData.unit,
          }),
        });

        const data = await response.json();
        if (response.ok && data?.totalEmission !== undefined) {
          setFormData((prev) => ({
            ...prev,
            totalEmission: Number(data.totalEmission).toFixed(2),
          }));
        } else {
          setFormData((prev) => ({ ...prev, totalEmission: '' }));
        }
      } catch (err) {
        console.error("Failed to estimate emission with Gemini:", err);
        setFormData((prev) => ({ ...prev, totalEmission: '' }));
      }
    };

    const timeoutId = setTimeout(() => {
        fetchEmissionFactor();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.name, formData.quantity, formData.unit]);

  // Helper to calculate emission factor (Checks database first, falls back to Gemini)
  const getEmissionValue = async (name, qty, unit) => {
    try {
      const queryParams = new URLSearchParams({ itemName: name, quantity: qty, unit }).toString();
      const response = await fetch(`https://my-node-backend-gold.vercel.app/api/emission-factor/calculate?${queryParams}`);
      const data = await response.json();
      if (response.ok && data?.totalEmission !== undefined) {
        return data.totalEmission;
      }
    } catch (err) {
      console.warn("Db lookup failed, trying fallback emission factor...");
    }
    try {
      const response = await fetch("http://localhost:5001/calculate-emission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: qty, unit })
      });
      const data = await response.json();
      if (response.ok && data?.totalEmission !== undefined) {
        return data.totalEmission;
      }
    } catch (err) {
      console.error("Fallback emission factor failed:", err);
    }
    return 0;
  };
  // OCR Upload to Python port 5001
  // OCR Upload to Python port 5001
  const runOCR = async (file) => {
    setOcrLoading(true);
    setMessage('');
    setOcrText('');
    const formDataOCR = new FormData();
    formDataOCR.append("file", file);

    try {
      const response = await fetch("http://localhost:5001/ocr", {
        method: "POST",
        body: formDataOCR,
      });

      const data = await response.json();
      
     if (response.ok && data) {
        console.log("Structured AI OCR Result:", data);
        setOcrText(JSON.stringify(data, null, 2));

        const itemsArray = Array.isArray(data) ? data : [data];
        setMessage("Calculating carbon footprint for all scanned items...");

        // Automatically calculate emissions for all items right now
        const processedItems = [];
        for (const item of itemsArray) {
          const emission = await getEmissionValue(item.name, item.quantity, item.unit);
          processedItems.push({
            ...item,
            totalEmission: emission
          });
        }

        setScannedItems(processedItems);

        if (processedItems.length > 0) {
          const firstItem = processedItems[0];
          // Populate the form fields completely (including visual emission)
          setFormData((prev) => ({
            ...prev,
            name: firstItem.name || prev.name,
            purchaseDate: firstItem.purchaseDate || prev.purchaseDate || getTodayDateString(),
            quantity: firstItem.quantity !== undefined ? firstItem.quantity : prev.quantity,
            unit: firstItem.unit || prev.unit,
            totalEmission: Number(firstItem.totalEmission).toFixed(2),
            warrantyPeriod: firstItem.warrantyPeriod !== null ? firstItem.warrantyPeriod : prev.warrantyPeriod,
            expiryDate: firstItem.expiryDate || prev.expiryDate,
          }));
        }

        setMessage(`AI Bill Scanning and footprint calculations complete! Detected ${processedItems.length} item(s).`);
      } else {
        setMessage(data.error || "Could not extract details from the image.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      setMessage("AI Scan Error: Is your Python backend running and is the Gemini API Key set?");
    } finally {
      setOcrLoading(false);
    }
  };
  // Helper to dynamically calculate emissions for multi-item sequences
  

 const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Submitting entries...');

    const itemsToSubmit = scannedItems.length > 0 ? scannedItems : [{
      name: formData.name,
      quantity: formData.quantity,
      unit: formData.unit,
      purchaseDate: formData.purchaseDate,
      totalEmission: formData.totalEmission || 0,
      warrantyPeriod: formData.warrantyPeriod,
      expiryDate: formData.expiryDate
    }];

    try {
      let successCount = 0;

      for (let i = 0; i < itemsToSubmit.length; i++) {
        const item = itemsToSubmit[i];

        // DYNAMIC SILENT EXPIRY PREDICTION (ONLY IF BLANK ON SUBMISSION)
        let finalExpiryDate = item.expiryDate || formData.expiryDate || '';

        if ((activeTab === 'food' || activeTab === 'medicine') && !finalExpiryDate) {
          try {
            setMessage(`Predicting expiration for "${item.name}"...`);
            const predictRes = await fetch("http://localhost:5001/predict-expiry", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit || formData.unit,
                city: formData.city,
                country: formData.country,
                email: formData.email,
                purchaseDate: item.purchaseDate || formData.purchaseDate || getTodayDateString()
              })
            });
            const predictData = await predictRes.json();
            if (predictRes.ok && predictData?.expiryDate) {
              finalExpiryDate = predictData.expiryDate;
            }
          } catch (err) {
            console.error("Silent expiry prediction failed, using fallback:", err);
          }
        }

        const form = new FormData();
        form.append('email', formData.email);
        form.append('itemName', item.name); 
        form.append('city', formData.city);
        form.append('country', formData.country);
        form.append('purchaseDate', item.purchaseDate || formData.purchaseDate || getTodayDateString());
        form.append('category', activeTab); 
        form.append('quantity', parseFloat(item.quantity)); 
        form.append('unit', item.unit || formData.unit);
        form.append('totalEmission', parseFloat(item.totalEmission) || 0); 

        // Attach the bill image only to the first item of batch scans to save Vercel payload space
        if (formData.bill && i === 0) {
          form.append('bill', formData.bill);
        }

        if (activeTab === 'product') {
          form.append('warrantyPeriod', item.warrantyPeriod !== undefined && item.warrantyPeriod !== null ? item.warrantyPeriod : (formData.warrantyPeriod || ''));
        } else {
          form.append('expiryDate', finalExpiryDate);
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
        setMessage(`${successCount} item(s) submitted successfully!`);
        setScannedItems([]); // Clear scanned list on success
      } else {
        setMessage(`Submitted ${successCount} out of ${itemsToSubmit.length} items successfully.`);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      setMessage('Network error. Please try again.');
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

  // Comprehensive Active Voice Recognition Parsing Logic
  useEffect(() => {
    if (!transcript) return;

    let spokenText = transcript.toLowerCase()
      .replace(/ at /g, '@')
      .replace(/ dot /g, '.')
      .replace(/ underscore /g, '_')
      .replace(/ dash /g, '-')
      .replace(/\s+/g, ' ');

    const wordToNumber = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };

const parseSpokenDate = (str) => {
      if (!str) return null;
      
      let cleaned = str.toLowerCase()
        .replace(/-/g, ' ')   // 1. Replace all dashes with spaces so "2020-6" becomes "2020 6"
        .replace(/,/g, '')    // 2. Strip commas
        .replace(/\./g, '')   // 3. Strip periods
        .replace(/(\d+)(st|nd|rd|th)/g, '$1') 
        .replace(/\bof\b/g, '')
        .trim();

      // Convert verbal years directly to digits
      cleaned = cleaned
        .replace(/twenty\s+twenty\s+six/g, '2026')
        .replace(/twenty\s+twenty\s+seven/g, '2027')
        .replace(/twenty\s+twenty\s+eight/g, '2028')
        .replace(/twenty\s+twenty\s+nine/g, '2029')
        .replace(/twenty\s+twenty\s+five/g, '2025')
        .replace(/twenty\s+twenty\s+four/g, '2024')
        .replace(/twenty\s+twenty\s+three/g, '2023')
        .replace(/twenty\s+twenty\s+two/g, '2022')
        .replace(/twenty\s+twenty\s+one/g, '2021')
        .replace(/twenty\s+twenty/g, '2020')
        .replace(/two\s+thousand\s+twenty\s+six/g, '2026')
        .replace(/two\s+thousand\s+twenty\s+seven/g, '2027')
        .replace(/two\s+thousand\s+twenty\s+eight/g, '2028')
        .replace(/two\s+thousand\s+twenty\s+nine/g, '2029')
        .replace(/two\s+thousand\s+twenty\s+five/g, '2025')
        .replace(/two\s+thousand\s+twenty\s+four/g, '2024')
        .replace(/two\s+thousand\s+twenty\s+three/g, '2023')
        .replace(/two\s+thousand\s+twenty\s+two/g, '2022')
        .replace(/two\s+thousand\s+twenty\s+one/g, '2021')
        .replace(/two\s+thousand\s+twenty/g, '2020');

      // Merge spaces split by a space: "2020 6" -> "2026"
      cleaned = cleaned.replace(/2020\s+(\d)/g, '202$1');

      const isoMatch = cleaned.match(/(\d{4})[-\s](\d{1,2})[-\s](\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      }

      const dmyMatch = cleaned.match(/(\d{1,2})[-\/\s](\d{1,2})[-\/\s](\d{2,4})/);
      if (dmyMatch) {
        let [_, d, m, y] = dmyMatch;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // Expanded to support short month abbreviations
      const monthsMap = {
        january: '01', jan: '01',
        february: '02', feb: '02',
        march: '03', mar: '03',
        april: '04', apr: '04',
        may: '05',
        june: '06', jun: '06',
        july: '07', jul: '07',
        august: '08', aug: '08',
        september: '09', sep: '09', sept: '09',
        october: '10', oct: '10',
        november: '11', nov: '11',
        december: '12', dec: '12'
      };

      const words = cleaned.split(/\s+/);
      let day = null;
      let month = null;
      let year = null;

      words.forEach((word) => {
        if (monthsMap[word]) {
          month = monthsMap[word];
        } else if (/^\d{4}$/.test(word)) {
          year = word;
        } else if (/^\d{1,2}$/.test(word)) {
          day = word.padStart(2, '0');
        }
      });

      if (day && month && year) {
        return `${year}-${month}-${day}`;
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
          if (kwIndex !== -1 && kwIndex < limitIndex) {
            limitIndex = kwIndex;
          }
        }
        
        return after.substring(0, limitIndex).trim();
      };

      const controlKeywords = [
        'email', 'item', 'name', 'quantity', 'qty', 'unit', 
        'city', 'country', 'purchase date', 'purchase', 
        'warranty', 'expiry date', 'expiry', 'expires'
      ];

      // 1. Email Parse
      const emailVal = extractValue(spokenText, 'email is', controlKeywords) || 
                       extractValue(spokenText, 'email', controlKeywords);
      if (emailVal) {
        updatedForm.email = emailVal.replace(/\s/g, '');
      }

      // 2. Item Name Parse
      const nameVal = extractValue(spokenText, 'item is', controlKeywords) || 
                      extractValue(spokenText, 'item', controlKeywords) || 
                      extractValue(spokenText, 'name is', controlKeywords) || 
                      extractValue(spokenText, 'name', controlKeywords);
      if (nameVal) {
        updatedForm.name = nameVal;
      }

      // 3. Quantity Parse
      const qtyVal = extractValue(spokenText, 'quantity is', controlKeywords) || 
                     extractValue(spokenText, 'quantity', controlKeywords) ||
                     extractValue(spokenText, 'qty is', controlKeywords) ||
                     extractValue(spokenText, 'qty', controlKeywords);
      if (qtyVal) {
        if (wordToNumber[qtyVal] !== undefined) {
          updatedForm.quantity = wordToNumber[qtyVal];
        } else {
          const parsedQty = parseFloat(qtyVal);
          if (!isNaN(parsedQty)) {
            updatedForm.quantity = parsedQty;
          }
        }
      }

      // 4. Unit Parse
     // 4. Unit Parse
      const unitVal = extractValue(spokenText, 'unit is', controlKeywords) || 
                      extractValue(spokenText, 'unit', controlKeywords);
      if (unitVal) {
        const unitMapping = {
          // kg mapping
          kg: 'kg', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
          // liter mapping
          liter: 'liter', liters: 'liter', litre: 'liter', litres: 'liter', ml: 'liter',
          // packet mapping
          packet: 'packet', packets: 'packet', pack: 'packet', packs: 'packet',
          // piece mapping
          piece: 'piece', pieces: 'piece', pcs: 'piece', pc: 'piece',
          // tablet mapping
          tablet: 'tablet', tablets: 'tablet', tab: 'tablet', tabs: 'tablet', pill: 'tablet', pills: 'tablet'
        };

        const cleanedUnit = unitVal.toLowerCase().replace(/[,.]/g, '').trim();
        const matchedUnit = unitMapping[cleanedUnit];
        
        if (matchedUnit) {
          updatedForm.unit = matchedUnit;
        }
      }

      // 5. City Parse
      const cityVal = extractValue(spokenText, 'city is', controlKeywords) || 
                      extractValue(spokenText, 'city', controlKeywords);
      if (cityVal) {
        updatedForm.city = cityVal.charAt(0).toUpperCase() + cityVal.slice(1);
      }

      // 6. Country Parse
      const countryVal = extractValue(spokenText, 'country is', controlKeywords) || 
                         extractValue(spokenText, 'country', controlKeywords);
      if (countryVal) {
        updatedForm.country = countryVal.charAt(0).toUpperCase() + countryVal.slice(1);
      }

      // 7. Purchase Date Parse
      const purchaseDateVal = extractValue(spokenText, 'purchase date is', controlKeywords) || 
                              extractValue(spokenText, 'purchase date', controlKeywords) ||
                              extractValue(spokenText, 'purchase is', controlKeywords);
      if (purchaseDateVal) {
        const parsedDate = parseSpokenDate(purchaseDateVal);
        if (parsedDate) {
          updatedForm.purchaseDate = parsedDate;
        }
      }

      // 8. Expiry Date Parse (Active in Medicine / Food Tabs)
      if (activeTab !== 'product') {
        const expiryDateVal = extractValue(spokenText, 'expiry date is', controlKeywords) || 
                              extractValue(spokenText, 'expiry is', controlKeywords) ||
                              extractValue(spokenText, 'expiry', controlKeywords) ||
                              extractValue(spokenText, 'expires', controlKeywords);
        if (expiryDateVal) {
          const parsedDate = parseSpokenDate(expiryDateVal);
          if (parsedDate) {
            updatedForm.expiryDate = parsedDate;
          }
        }
      }

      // 9. Warranty Period Parse (Active in Product Tab)
      if (activeTab === 'product') {
        const warrantyVal = extractValue(spokenText, 'warranty is', controlKeywords) || 
                            extractValue(spokenText, 'warranty', controlKeywords);
        if (warrantyVal) {
          const wMatch = warrantyVal.match(/(\d+)\s*(month|year|yr|mon)/);
          if (wMatch) {
            let val = parseInt(wMatch[1], 10);
            const scale = wMatch[2];
            if (scale.startsWith('year') || scale.startsWith('yr')) {
              val = val * 12;
            }
            updatedForm.warrantyPeriod = val;
          } else {
            const parsedInt = parseInt(warrantyVal, 10);
            if (!isNaN(parsedInt)) {
              updatedForm.warrantyPeriod = parsedInt;
            }
          }
        }
      }

      return updatedForm;
    });
  }, [transcript, activeTab]);

  if (!browserSupportsSpeechRecognition) {
    return <span className="text-white text-center mt-10 block">Your browser does not support voice recognition.</span>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Blobs */}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Qty <span className="text-red-500">*</span></label>
                  <input 
                    type="number" name="quantity" min="0.1" step="0.1" placeholder="1" required 
                    onChange={handleChange} value={formData.quantity}
                    className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Unit <span className="text-red-500">*</span></label>
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
                  className="w-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold rounded-lg px-4 py-3 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">City <span className="text-red-500">*</span></label>
                  <input 
                    type="text" name="city" placeholder="City" onChange={handleChange} value={formData.city}
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
                  className="w-full bg-slate-950/50 border border-slate-700 text-slate-400 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {activeTab === 'product' ? (
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Warranty (Months)</label>
                  <input 
                    type="number" name="warrantyPeriod" placeholder="e.g. 12" onChange={handleChange} value={formData.warrantyPeriod}
                    className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Expiry Date</label>
                  <input 
                    type="date" name="expiryDate" onChange={handleChange} value={formData.expiryDate}
                    className="w-full bg-slate-950/50 border border-slate-700 text-slate-400 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
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

          {/* OCR & Status Messages */}
          {ocrLoading && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm text-center animate-pulse">
              🔍 AI is analyzing your bill image...
            </div>
          )}
          
          {ocrText && (
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-xs h-32 overflow-y-auto whitespace-pre-wrap font-mono">
              <strong>Parsed AI JSON:</strong> {ocrText}
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
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02]"
            >
              ✅ Submit Entry
            </button>
            
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
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddEntry;



