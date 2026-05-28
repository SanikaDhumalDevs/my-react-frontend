import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
// import "./ManageExpiringProducts.css"; // REMOVED: Replaced with Tailwind

const ManageExpiringProducts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, username } = location.state || {};
  const [products, setProducts] = useState([]);
  const [selectedDonateId, setSelectedDonateId] = useState(null);

  useEffect(() => {
    if (email) {
      axios
        .get(`https://my-node-backend-gold.vercel.app/api/manage-expiring-products?email=${email}`)
        .then(res => {
          setProducts(res.data.entries || []);
        })
        .catch(err => console.error("Error fetching expiring products:", err));
    }
  }, [email]);

  const handleConsume = (item) => {
    navigate("/consume", { state: { item, email, username } });
  };

  const handleDonateClick = (itemId) => {
    // Toggle donation options for that row
    setSelectedDonateId(selectedDonateId === itemId ? null : itemId);
  };

  const handleDonateChoice = (choice, item) => {
    if (choice === "self") {
      // Redirect to DonateYourself.js page
      navigate("/donate-yourself", { state: { item, email, username } });
    } else if(choice === "platform"){
     navigate("/donate-via-platform", {state:{email, username}});
    }
    setSelectedDonateId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-x-hidden font-sans">
      
      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 text-center relative">
           {/* Back Button */}
           <button 
            onClick={() => navigate("/dashboard")}
            className="absolute top-0 left-0 text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
          >
            ← Back to Dashboard
          </button>

          <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-4 pt-10 md:pt-0">
            Manage Expiring Products
          </h2>
          <p className="text-slate-400 bg-slate-900/50 inline-block px-4 py-2 rounded-full border border-slate-800 text-sm">
            Logged in as: <strong className="text-purple-300">{username || email}</strong>
          </p>
        </header>

        {/* Table Container */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 uppercase text-xs font-bold tracking-wider border-b border-slate-800">
                    <th className="p-5">Product Name</th>
                    <th className="p-5">Category</th>
                    <th className="p-5">Expiry Date</th>
                    <th className="p-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.map(item => (
                    <tr key={item._id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="p-5 font-medium text-white">{item.itemName}</td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          item.category === 'food' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          item.category === 'medicine' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-5 text-slate-400">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 relative">
                          
                          {/* Consume Button (Only for Food) */}
                          {item.category === "food" && (
                            <button
                              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/50 rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-emerald-900/20 w-full md:w-auto"
                              onClick={() => handleConsume(item)}
                            >
                              Consume
                            </button>
                          )}

                          {/* Donate Button */}
                          <div className="relative w-full md:w-auto">
                            <button
                              className={`px-4 py-2 w-full md:w-auto rounded-lg text-sm font-bold transition-all shadow-lg border ${
                                selectedDonateId === item._id 
                                  ? "bg-purple-600 text-white border-purple-500"
                                  : "bg-purple-600/20 text-purple-400 border-purple-500/50 hover:bg-purple-600 hover:text-white"
                              }`}
                              onClick={() => handleDonateClick(item._id)}
                            >
                              Donate {selectedDonateId === item._id ? "▲" : "▼"}
                            </button>

                            {/* Dropdown Menu */}
                            {selectedDonateId === item._id && (
                              <div className="absolute right-0 md:left-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in-down">
                                <button
                                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-purple-400 transition-colors border-b border-slate-800"
                                  onClick={() => handleDonateChoice("self", item)}
                                >
                                  🙌 Donate by Yourself
                                </button>
                                <button
                                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-purple-400 transition-colors"
                                  onClick={() => handleDonateChoice("platform", item)}
                                >
                                  🚚 Donate via Platform
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-slate-400 text-lg">No products expiring in the next 10–20 days.</p>
              <p className="text-slate-600 text-sm mt-2">You are managing your inventory perfectly!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageExpiringProducts;