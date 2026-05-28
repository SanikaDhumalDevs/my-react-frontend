import React, { useState, useEffect } from "react";
import axios from "axios";
// import "./DonateViaPlatform.css"; // REMOVED: Replaced with Tailwind
import img4 from "../assets/img4.jpg";
import img5 from "../assets/img5.jpg";
import img6 from "../assets/img6.jpg";
import img7 from "../assets/img7.jpg";
import img8 from "../assets/img8.jpg";
import { useNavigate } from "react-router-dom";
// REMOVED: The line causing the error has been deleted.

const DonateViaPlatform = () => {
  const [formData, setFormData] = useState({
    donorName: "",
    email: "",
    contact: "",
    address: "",
    city:"",
    pinCode: "",
    itemName: "",
    quantity: "",
    foodType: "Snack",
    expiryDate: "",
    specialNote: "",
  });

  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);

  // Fetch previous donations for testimonials
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/donation-platform")
      .then((res) => setTestimonials(res.data))
      .catch((err) => console.error(err));
  }, []);
  

  // Handle form change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if(formData.city.trim().toLowerCase() !== "satara"){
        alert("Sorry! Donations are only accepted from Satara.");
        return;
    }
    try {
      await axios.post(
        "http://localhost:5000/api/donation-platform/add",
        formData
      );
      alert("✅ Thank you for your donation. Volunteers will reach out soon.");
      setFormData({
        donorName: "",
        email: "",
        contact: "",
        address: "",
        city:"",
        pinCode: "",
        itemName: "",
        quantity: "",
        foodType: "Snack",
        expiryDate: "",
        specialNote: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "❌ Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* Decorative Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
        </button>

        {/* Banner Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 leading-tight">
            Donate Food, Spread Smiles
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Make a difference today. Help those in need with just a few clicks.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl text-center hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🤝</div>
            <p className="text-slate-300">Your packed food items can reach NGOs and orphans quickly.</p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl text-center hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🥗</div>
            <p className="text-slate-300">Only fresh packed food items are accepted for safety.</p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl text-center hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🚚</div>
            <p className="text-slate-300">Our volunteers ensure timely delivery to the needy.</p>
          </div>
        </div>

        {/* Donation Form */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl mb-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Donation Form</h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Donor Details */}
            <div>
              <h3 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-4 border-b border-slate-800 pb-2">Donor Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  type="text" name="donorName" value={formData.donorName} onChange={handleChange} placeholder="Full Name" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
                <input
                  type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact Number" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
                <input
                  type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} placeholder="Pin Code" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
                <input
                  type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder="City (Satara only)" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
              </div>
              <textarea
                name="address" value={formData.address} onChange={handleChange} placeholder="Full Pickup Address" required rows="2"
                className="w-full mt-6 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
              />
            </div>

            {/* Section 2: Food Details */}
            <div>
              <h3 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-4 border-b border-slate-800 pb-2">Food Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  type="text" name="itemName" value={formData.itemName} onChange={handleChange} placeholder="Item Name (e.g. Biscuits)" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
                <input
                  type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="Quantity (No. of packs)" required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                />
                <select
                  name="foodType" value={formData.foodType} onChange={handleChange}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                >
                  <option value="Snack">Snack</option>
                  <option value="Canned">Canned</option>
                  <option value="Bottled">Bottled / Beverages</option>
                  <option value="Other">Other</option>
                </select>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 ml-1">Expiry Date</label>
                  <input
                    type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 focus:text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  />
                </div>
              </div>
              <textarea
                name="specialNote" value={formData.specialNote} onChange={handleChange} placeholder="Special Note (Optional)" rows="2"
                className="w-full mt-6 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.01] transition-all duration-200 text-lg"
            >
              Submit Donation
            </button>
          </form>
        </div>

        {/* Testimonials */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-white mb-10">Recent Donations</h2>
          <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide snap-x">
            {[img8, img5, img6, img7, img4].map((img, index) => (
              <div key={index} className="min-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden snap-center shadow-lg hover:shadow-purple-900/20 transition-all">
                <div className="h-48 overflow-hidden">
                  <img src={img} alt={`Donation ${index + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-4 text-center">
                  <p className="text-slate-300 font-medium text-sm">Helping hands in action ❤️</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900/50 border-t border-slate-800 py-8 text-center rounded-2xl">
          <p className="text-slate-400 font-semibold mb-2">📞 Contact Volunteers: +91-9876543210 | volunteer@email.com</p>
          <p className="text-slate-600 text-xs">Privacy Note: We respect your data and use it only for donation coordination.</p>
        </footer>

      </div>
    </div>
  );
};

export default DonateViaPlatform;