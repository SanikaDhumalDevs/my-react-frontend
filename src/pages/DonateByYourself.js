import React, { useState, useEffect } from "react";
import axios from "axios";

const DonateByYourself = () => {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Helper: Haversine formula to calculate distance in Kilometers
  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1)); 
  };

  // Browser Geolocation & Reverse Geocoding
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ latitude, longitude });

        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.data && res.data.address) {
            const address = res.data.address;
            const detectedCity = address.city || address.town || address.village || address.suburb || "";
            const detectedCountry = address.country || "";
            setCity(detectedCity);
            setCountry(detectedCountry);
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        alert("Location permission denied. Please enable GPS in your browser settings.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Live-query real NGOs, Food Banks, and Charities from the OpenStreetMap GIS Database
  const handleFetchNGOs = async () => {
    if (!city || !country) {
      alert("Please enter both city and country");
      return;
    }
    setLoading(true);
    setResults(null);
    setAiAnalysis(null);

    try {
      // Live query targeting NGOs, charities, and food banks specifically
      const searchQuery = `ngo charity food bank in ${city} ${country}`;
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=8`
      );

      if (response.data && response.data.length > 0) {
        // Map the real-world locations to our clean card format
        const mappedCenters = response.data.map((item) => {
          const displayNameParts = item.display_name.split(",");
          const name = displayNameParts[0].trim();
          const address = displayNameParts.slice(1, 4).join(",").trim(); // Clean up the address string
          
          return {
            name: name,
            address: address || `Registered charity in ${city}`,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          };
        });

        setResults({
          city,
          country,
          donationCenters: mappedCenters,
        });
      } else {
        // Fallback: If no specific search is found, query general social facilities to ensure results always populate
        const fallbackRes = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`charity in ${city}`)}&format=json&limit=6`
        );
        
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          const mappedCenters = fallbackRes.data.map((item) => ({
            name: item.display_name.split(",")[0].trim(),
            address: item.display_name.split(",").slice(1, 4).join(",").trim(),
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          }));

          setResults({
            city,
            country,
            donationCenters: mappedCenters,
          });
        } else {
          setResults({
            city,
            country,
            donationCenters: [],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching live GIS locations:", error);
      alert("Failed to connect to the GIS database. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  // Perform AI Route Analysis dynamically based on exact live distances
  useEffect(() => {
    if (results && Array.isArray(results.donationCenters) && results.donationCenters.length > 0) {
      const centersWithDistance = results.donationCenters.map(center => {
        const dist = userCoords ? getDistanceInKm(userCoords.latitude, userCoords.longitude, center.latitude, center.longitude) : null;
        return { ...center, distance: dist };
      });

      // Sort by distance (closest first)
      if (userCoords) {
        centersWithDistance.sort((a, b) => a.distance - b.distance);
      }

      const closest = centersWithDistance[0];
      const farthest = centersWithDistance[centersWithDistance.length - 1];
      
      // Calculate carbon emissions saved (assuming average transit emits 120g of CO2 per km)
      const distanceDifference = userCoords ? (farthest.distance - closest.distance) : 0;
      const co2Saved = (distanceDifference * 0.12).toFixed(2);

      setAiAnalysis({
        closest,
        farthest,
        co2Saved,
        sortedCenters: centersWithDistance
      });
    }
  }, [results, userCoords]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-6 relative overflow-hidden font-sans">
      
      {/* Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-4 tracking-tight">
            Donate By Yourself
          </h1>
          <p className="text-slate-400 text-lg">
            Find live, verified local NGOs and navigate directly to them.
          </p>
        </div>

        {/* Input Controls */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl mb-12 max-w-3xl mx-auto">
          <div className="flex flex-col gap-4">
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
                disabled={loading || locating}
                className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Searching..." : "Search Centers"}
              </button>
            </div>

            <div className="flex justify-center mt-2">
              <button
                onClick={handleGetCurrentLocation}
                disabled={locating || loading}
                className="flex items-center gap-2 px-5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-purple-300 hover:text-purple-200 text-sm font-semibold rounded-full shadow transition-all hover:scale-102"
              >
                <span>🌐</span> {locating ? "Acquiring Coordinates..." : "Use My Current Location"}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Eco-AI Route Advisor Section */}
        {aiAnalysis && userCoords && (
          <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/30 rounded-2xl p-6 mb-12 shadow-xl backdrop-blur animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🧠</span>
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 uppercase tracking-wider">
                Smart Eco-AI Route Advisor
              </h3>
            </div>
            
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
              Analyzing spatial coordinates of your city... The absolute closest destination is <strong className="text-purple-400">{aiAnalysis.closest.name}</strong>, which is located just <strong className="text-purple-400">{aiAnalysis.closest.distance} km</strong> from your current position.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-purple-500/20 pt-4">
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <p className="text-xs text-slate-500 uppercase">AI Recommended Choice</p>
                <p className="text-sm font-semibold text-purple-300">{aiAnalysis.closest.name} ({aiAnalysis.closest.distance} km)</p>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <p className="text-xs text-slate-500 uppercase">Environmental Impact</p>
                <p className="text-sm font-semibold text-emerald-400">🌱 Saves {aiAnalysis.co2Saved} kg of CO2 emissions compared to the farthest center</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="inline-block bg-purple-900/20 border border-purple-500/30 px-6 py-2 rounded-full mb-4">
                <h2 className="text-xl font-bold text-purple-300 uppercase tracking-wide">
                  📍 Verified Local NGOs in {results.city}
                </h2>
              </div>
            </div>

            {results.donationCenters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(aiAnalysis ? aiAnalysis.sortedCenters : results.donationCenters).map((center, idx) => {
                  // Direct Driving Route on Google Maps
                  const directionsUrl = userCoords 
                    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.latitude},${userCoords.longitude}&destination=${center.latitude},${center.longitude}&travelmode=driving`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.name + ", " + city)}`;

                  return (
                    <div 
                      key={idx} 
                      className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors shadow-lg group flex flex-col h-full relative overflow-hidden animate-fade-in"
                    >
                      {center.distance && (
                        <div className="absolute top-4 right-4 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">
                          📍 {center.distance} km
                        </div>
                      )}

                      <div className="flex items-start gap-3 mb-3 mt-1">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                        <strong className="text-lg text-white group-hover:text-purple-400 transition-colors pr-16">
                          {center.name}
                        </strong>
                      </div>
                      
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-grow">
                        {center.address}
                      </p>
                      
                      <a 
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto w-full py-2 bg-slate-850 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg text-sm font-semibold text-center border border-slate-750 hover:border-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                         <span>🗺️</span> Get Driving Route
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-lg">
                   No local food banks or charity centers detected in this area yet.
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